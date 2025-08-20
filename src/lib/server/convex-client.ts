import { ConvexHttpClient } from 'convex/browser';
import { env } from '$env/dynamic/public';

let convexClient: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient {
	if (!convexClient) {
		if (!env.PUBLIC_CONVEX_URL) {
			throw new Error('PUBLIC_CONVEX_URL environment variable is required');
		}
		convexClient = new ConvexHttpClient(env.PUBLIC_CONVEX_URL);
	}
	return convexClient;
}

