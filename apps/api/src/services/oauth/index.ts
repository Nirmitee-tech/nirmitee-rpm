/**
 * OAuth Services Export
 */

export * from './oauth-provider.interface';
export * from './oauth-service';

// Import providers to register them automatically
import './google-oauth-provider';
import './microsoft-oauth-provider';
