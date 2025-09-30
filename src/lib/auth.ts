import { NextRequest } from 'next/server';

/**
 * Stub authentication function
 * Returns null since authentication is not set up yet
 */
export async function getCurrentUser(request: NextRequest) {
  // No authentication configured - return null
  return null;
}