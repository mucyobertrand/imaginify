/* eslint-disable camelcase */
import { clerkClient } from "@clerk/nextjs";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

  // CREATE
  if (eventType === "user.created") {
    try {
      console.log('Processing user.created event:', evt.data);
      
      const { id, email_addresses, image_url, first_name, last_name, username } = evt.data;

      if (!email_addresses || email_addresses.length === 0) {
        console.error('No email address found in user data');
        return NextResponse.json(
          { error: 'No email address provided' },
          { status: 400 }
        );
      }

      const user = {
        clerkId: id,
        email: email_addresses[0].email_address,
        username: username || `user_${Math.random().toString(36).substring(2, 10)}`,
        firstName: first_name || '',
        lastName: last_name || '',
        photo: image_url || '',
      };

      console.log('Creating user in database:', user);
      const newUser = await createUser(user);
      console.log('User created in database:', newUser);

      // Set public metadata
      if (newUser) {
        try {
          await clerkClient.users.updateUserMetadata(id, {
            publicMetadata: {
              userId: newUser._id,
            },
          });
          console.log('Updated Clerk user metadata with MongoDB ID');
        } catch (metadataError) {
          console.error('Error updating Clerk user metadata:', metadataError);
          // Don't fail the request if metadata update fails
        }
      }

      return NextResponse.json({ message: "OK", user: newUser });
    } catch (error) {
      console.error('Error in user.created webhook handler:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }

  // UPDATE
  if (eventType === "user.updated") {
    try {
      console.log('Processing user.updated event:', evt.data);
      
      const { id, image_url, first_name, last_name, username } = evt.data;

      const userData = {
        firstName: first_name || '',
        lastName: last_name || '',
        username: username || `user_${Math.random().toString(36).substring(2, 10)}`,
        photo: image_url || '',
      };

      console.log('Updating user in database:', { id, user: userData });
      const updatedUser = await updateUser(id, userData);
      console.log('User updated in database:', updatedUser);

      return NextResponse.json({ message: "OK", user: updatedUser });
    } catch (error) {
      console.error('Error in user.updated webhook handler:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }

  // DELETE
  if (eventType === "user.deleted") {
    try {
      const { id } = evt.data;
      console.log('Processing user.deleted event for user ID:', id);
      
      if (!id) {
        console.error('No user ID provided for deletion');
        return NextResponse.json(
          { error: 'User ID is required for deletion' },
          { status: 400 }
        );
      }

      const deletedUser = await deleteUser(id);
      console.log('User deleted from database:', deletedUser);

      return NextResponse.json({ message: "OK", user: deletedUser });
    } catch (error) {
      console.error('Error in user.deleted webhook handler:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }

  console.log(`Webhook with and ID of ${id} and type of ${eventType}`);
  console.log("Webhook body:", body);

  return new Response("", { status: 200 });
}