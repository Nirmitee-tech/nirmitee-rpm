import { api } from './client';
import { User } from './users';

export const profileApi = {
  uploadAvatar: async (file: File): Promise<User> => {
    const formData = new FormData();
    formData.append('avatar', file);

    return api.post<User>('/api/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  removeAvatar: async (): Promise<User> => {
    return api.delete<User>('/api/users/me/avatar');
  },
};
