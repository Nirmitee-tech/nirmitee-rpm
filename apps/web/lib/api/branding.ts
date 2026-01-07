import { api } from './client';

export interface BrandingSettings {
  logo?: string | null;
  favicon?: string | null;
  primaryColor?: string;
  accentColor?: string;
  darkMode?: boolean;
}

export interface UpdateBrandingResponse {
  id: string;
  name: string;
  branding: BrandingSettings;
  updatedAt: string;
}

export const brandingApi = {
  async updateBranding(data: BrandingSettings): Promise<UpdateBrandingResponse> {
    return api.patch<UpdateBrandingResponse>(
      '/api/organizations/current/branding',
      data
    );
  },

  async uploadLogo(logoUrl: string, type: 'logo' | 'favicon'): Promise<UpdateBrandingResponse> {
    return api.post<UpdateBrandingResponse>(
      '/api/organizations/current/logo',
      { logoUrl, type }
    );
  },

  async removeLogo(type: 'logo' | 'favicon'): Promise<UpdateBrandingResponse> {
    return api.delete<UpdateBrandingResponse>(
      `/api/organizations/current/logo?type=${type}`
    );
  },
};
