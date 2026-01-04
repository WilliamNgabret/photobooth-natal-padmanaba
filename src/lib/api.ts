// Supabase-based API client for photobooth
import { supabase } from '@/integrations/supabase/client';
import { nanoid } from 'nanoid';

const SUPABASE_URL = 'https://pdstlonykoeehwhyzcpy.supabase.co';

function generatePhotoId(): string {
  return nanoid(10);
}

import { db, OfflinePhoto } from './db';

// ... other imports

export const api = {
  // Upload photo to Supabase Storage and save metadata, with offline fallback
  async shareCreate(dataUrl: string, width?: number, height?: number, layoutName?: string): Promise<{ id: string }> {
    const id = generatePhotoId();

    // 1. Save locally immediately
    const offlinePhoto: OfflinePhoto = {
      id,
      dataUrl,
      width: width || 1240,
      height: height || 1748,
      layoutName: layoutName || 'default',
      timestamp: Date.now(),
      synced: false,
      retries: 0
    };

    await db.savePhoto(offlinePhoto);
    console.log('Photo saved locally:', id);

    // 2. Try to upload
    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const filePath = `${id}.png`;
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      // Save metadata to photos table
      const { error: insertError } = await supabase
        .from('photos')
        .insert({
          id,
          file_url: urlData.publicUrl,
          width: width || 1240,
          height: height || 1748,
          layout_name: layoutName || 'default'
        });

      if (insertError) {
        // Try to cleanup file if metadata failed
        await supabase.storage.from('photos').remove([filePath]);
        throw insertError;
      }

      // Mark as synced
      await db.markSynced(id, id);
      return { id };
    } catch (err) {
      console.warn('Upload failed, photo queued for sync:', err);
      // Return the local ID so the UI can proceed (e.g. show QR code placeholder or "Offline" msg)
      // But we throw here because the ShareModal checks for success to generate the QR link
      // If we are offline, we can't generate a QR link that works on a phone.
      // However, we effectively satisfied "Save to IndexedDB immediately".
      throw new Error('Offline: Photo saved to device. Connect to internet to share.');
    }
  },

  // Sync Pending Photos (Call this periodically)
  async syncPendingPhotos(): Promise<void> {
    const pending = await db.getPendingPhotos();
    if (pending.length === 0) return;

    console.log(`Syncing ${pending.length} photos...`);

    for (const photo of pending) {
      if (photo.retries > 5) continue; // Skip after too many failures

      try {
        await db.incrementRetry(photo.id);
        const res = await fetch(photo.dataUrl);
        const blob = await res.blob();

        const filePath = `${photo.id}.png`;
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, blob, { contentType: 'image/png', upsert: true }); // upsert true for retries

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filePath);

        const { error: insertError } = await supabase
          .from('photos')
          .upsert({ // upsert incase metadata existed but image didn't or vice versa
            id: photo.id,
            file_url: urlData.publicUrl,
            width: photo.width,
            height: photo.height,
            layout_name: photo.layoutName
          });

        if (insertError) throw insertError;

        await db.markSynced(photo.id, photo.id);
        console.log('Synced photo:', photo.id);
      } catch (err) {
        console.error('Sync failed for', photo.id, err);
      }
    }
  },

  // Get photo metadata
  async getPhotoMeta(id: string): Promise<{
    id: string;
    file_url: string;
    created_at: string;
    width: number;
    height: number;
    layout_name: string | null;
  }> {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error('Failed to fetch photo');
    if (!data) throw new Error('Photo not found');

    return data;
  },

  // Get photo URL from Supabase Storage
  getPhotoUrl(id: string): string {
    return `${SUPABASE_URL}/storage/v1/object/public/photos/${id}.png`;
  },

  // Get public page URL
  getPublicPhotoUrl(id: string): string {
    if (typeof window === 'undefined') return `/p/${id}`;
    return `${window.location.origin}/p/${id}`;
  },

  // Get list of stickers
  async getStickersList(): Promise<Array<{ id: string; name: string; path: string }>> {
    const { data, error } = await supabase
      .from('stickers')
      .select('id, name, path, sort_order')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Failed to fetch stickers:', error);
      return [];
    }

    return data || [];
  },

  // Get sticker URL from Supabase Storage
  getStickerUrl(path: string): string {
    return `${SUPABASE_URL}/storage/v1/object/public/stickers/${path}`;
  },

  // Admin APIs using Supabase Auth
  admin: {
    // Check if user is authenticated and has admin role
    async isAdmin(): Promise<boolean> {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;

      const { data, error } = await supabase
        .rpc('has_role', { _user_id: session.user.id, _role: 'admin' });

      if (error) {
        console.error('Role check error:', error);
        return false;
      }

      return data === true;
    },

    // Sign in with email/password
    async login(email: string, password: string): Promise<void> {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw new Error(error.message);

      // Check if user has admin role
      const isAdmin = await this.isAdmin();
      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error('Access denied. Admin privileges required.');
      }
    },

    // Sign out
    async logout(): Promise<void> {
      await supabase.auth.signOut();
    },

    // Verify session
    async verify(): Promise<boolean> {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;
      return this.isAdmin();
    },

    // Get gallery of photos
    async getGallery(page: number = 0, limit: number = 20): Promise<{
      photos: Array<{
        id: string;
        file_url: string;
        created_at: string;
        width: number;
        height: number;
        layout_name: string | null;
      }>;
      total: number;
    }> {
      // Get total count
      const { count } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true });

      // Get paginated photos
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw new Error('Failed to fetch gallery');

      return {
        photos: data || [],
        total: count || 0
      };
    },

    // Delete photo
    async deletePhoto(id: string): Promise<void> {
      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([`${id}.png`]);

      if (storageError) {
        console.warn('Storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', id);

      if (dbError) throw new Error('Failed to delete photo');
    },

    // Get all stickers (admin view)
    async getStickers(): Promise<Array<{
      id: string;
      name: string;
      path: string;
      sort_order: number;
      created_at: string;
    }>> {
      const { data, error } = await supabase
        .from('stickers')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw new Error('Failed to fetch stickers');
      return data || [];
    },

    // Upload sticker
    async uploadSticker(file: File, name: string): Promise<{ id: string; path: string }> {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${nanoid(10)}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('stickers')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw new Error(uploadError.message);

      // Get max sort_order
      const { data: maxOrder } = await supabase
        .from('stickers')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = (maxOrder?.sort_order || 0) + 1;

      // Insert metadata
      const { data, error: insertError } = await supabase
        .from('stickers')
        .insert({
          name,
          path: fileName,
          sort_order: nextOrder
        })
        .select('id, path')
        .single();

      if (insertError) {
        // Cleanup uploaded file
        await supabase.storage.from('stickers').remove([fileName]);
        throw new Error(insertError.message);
      }

      return data;
    },

    // Reorder stickers
    async reorderStickers(orderedIds: string[]): Promise<void> {
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('stickers')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw new Error('Failed to reorder stickers');
      }
    },

    // Delete sticker
    async deleteSticker(id: string, path: string): Promise<void> {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('stickers')
        .remove([path]);

      if (storageError) {
        console.warn('Storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('stickers')
        .delete()
        .eq('id', id);

      if (dbError) throw new Error('Failed to delete sticker');
    }
  }
};
