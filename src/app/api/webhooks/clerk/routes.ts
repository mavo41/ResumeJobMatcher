  import { Webhook } from 'svix'
  import { headers } from 'next/headers'
  import { WebhookEvent } from '@clerk/nextjs/server'
  import { ConvexHttpClient } from 'convex/browser'
  import { api } from '../../../../../convex/_generated/api'
  import { NextResponse } from 'next/server'

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

  export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
    
    if (!WEBHOOK_SECRET) {
      console.error('Missing CLERK_WEBHOOK_SECRET environment variable')
      return new NextResponse('Webhook secret not configured', { status: 500 })
    }

    // Get the headers (await the Promise)
    const headersList = await headers()
    const svix_id = headersList.get('svix-id')
    const svix_timestamp = headersList.get('svix-timestamp')
    const svix_signature = headersList.get('svix-signature')

    // If there are no Svix headers, the request is not from Clerk
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new NextResponse('Missing svix headers', { status: 400 })
    }

    // Get the body
    const payload = await req.json()
    const body = JSON.stringify(payload)

    // Create a new Svix instance with your webhook secret
    const wh = new Webhook(WEBHOOK_SECRET)
    let evt: WebhookEvent

    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent
    } catch (err) {
      console.error('Error verifying webhook:', err)
      return new NextResponse('Webhook verification failed', { status: 400 })
    }

    const { type, data } = evt

    // Handling user creation/update
    if (type === 'user.created' || type === 'user.updated') {
      const { id, email_addresses, first_name, last_name, username, image_url } = data
      
      try {
        await convex.mutation(api.users.syncUser, {
        userId: id,
        name: `${first_name || ''} ${last_name || ''}`.trim() || username || 'Anonymous',
        email: email_addresses[0]?.email_address || '',
        clerkId: id,
        Image: image_url || '',
        // role is NOT passed - will be preserved on update
      })
        console.log(`Successfully synced user ${id} to Convex`)
      } catch (error) {
        console.error('Error syncing user to Convex:', error)
        return new NextResponse('Failed to sync user', { status: 500 })
      }
    }

    return new NextResponse('Webhook received', { status: 200 })
  }