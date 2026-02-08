# Apple OAuth Setup Guide

This guide will help you fix the "Unable to exchange external code" error when using Sign in with Apple.

## The Problem

The error occurs because:
1. **Missing Supabase credentials** in your `.env` file
2. **Mismatched redirect URLs** between Apple, Supabase, and your application

## Step 1: Add Supabase Credentials to .env

Your `.env` file now includes placeholders for the required credentials:

```bash
SUPABASE_URL="https://gcbfcbumlgfzzqioyotq.supabase.co"
SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

### How to get these values:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/gcbfcbumlgfzzqioyotq/settings/api
2. Copy the following values:
   - **Project URL** → Replace `SUPABASE_URL` value (should already be correct)
   - **anon/public key** → Replace `SUPABASE_ANON_KEY` value
   - **service_role key** → Replace `SUPABASE_SERVICE_ROLE_KEY` value

⚠️ **Important**: Keep these values secret, especially the service role key!

## Step 2: Configure Supabase Redirect URLs

1. Go to: https://supabase.com/dashboard/project/gcbfcbumlgfzzqioyotq/auth/url-configuration
2. Under **Redirect URLs**, add the following URLs:
   ```
   https://orphanbars.com/auth/callback
   https://orphan-bars.onrender.com/auth/callback
   http://localhost:5000/auth/callback
   ```
   
   ⚠️ **Important**: Add ALL domains where your app runs:
   - Production domain (`orphanbars.com`)
   - Onrender deployment domain (`orphan-bars.onrender.com`)
   - Local development (`localhost:5000`)

3. Under **Site URL**, set your primary domain:
   ```
   https://orphanbars.com
   ```

## Step 3: Configure Apple Sign In

1. Go to [Apple Developer Console](https://developer.apple.com/account/resources/identifiers/list)
2. Find your App ID or Services ID for Sign in with Apple
3. Edit the configuration and ensure the **Return URLs** include:
   ```
   https://gcbfcbumlgfzzqioyotq.supabase.co/auth/v1/callback
   ```

   **Important**: This is the Supabase callback URL, NOT your app's URL. Supabase handles the OAuth flow and then redirects to your app.

4. The **Domains** field should include:
   ```
   orphanbars.com
   gcbfcbumlgfzzqioyotq.supabase.co
   ```

## Step 4: Verify Supabase Apple OAuth Configuration

1. Go to: https://supabase.com/dashboard/project/gcbfcbumlgfzzqioyotq/auth/providers
2. Find **Apple** in the provider list
3. Ensure it's enabled and configured with:
   - **Services ID** (from Apple Developer Console)
   - **Key ID** (from Apple Developer Console)
   - **Team ID** (from Apple Developer Console)
   - **Private Key** (from Apple Developer Console - the .p8 file contents)

## Step 5: Restart Your Application

After updating the `.env` file with the correct keys:

```bash
# If running locally
npm run dev

# If deployed, redeploy the application with the new environment variables
```

## Testing the Fix

1. Clear your browser cache and cookies for `orphanbars.com`
2. Try signing in with Apple again
3. You should now be redirected to `/auth/callback` instead of seeing an error on the root page
4. If you still see an error, check the browser console for detailed error messages

## Common Issues

### "No session found. The redirect URL may not be configured"
This happens when Supabase redirects to your app, but your app's domain isn't in the allowed redirect URLs list:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your exact domain with `/auth/callback` to the Redirect URLs list
3. If you're on `orphan-bars.onrender.com`, add: `https://orphan-bars.onrender.com/auth/callback`
4. Save and try signing in again

### "Authentication service unavailable"
- Check that all three Supabase environment variables are set correctly
- Restart your server after changing `.env`

### "Invalid credentials"
- Double-check that you copied the correct keys from the Supabase Dashboard
- Make sure there are no extra spaces or quotes in the `.env` file

### Still getting "Unable to exchange external code"
- Verify the Apple Developer Console return URLs match exactly: `https://gcbfcbumlgfzzqioyotq.supabase.co/auth/v1/callback`
- Check that orphanbars.com is listed in the Apple Developer Console domains
- Ensure Apple Sign In is enabled in the Supabase Dashboard

## Architecture Overview

Here's how the authentication flow works:

1. User clicks "Sign in with Apple" on your app
2. App redirects to Supabase Auth URL → `https://gcbfcbumlgfzzqioyotq.supabase.co/auth/v1/authorize?provider=apple`
3. Supabase redirects to Apple Sign In
4. User authenticates with Apple
5. **Apple redirects back to Supabase**: `https://gcbfcbumlgfzzqioyotq.supabase.co/auth/v1/callback`
6. Supabase exchanges the Apple code for user info
7. **Supabase redirects to your app**: `https://orphanbars.com/auth/callback`
8. Your app receives the session and completes sign-in

The "Unable to exchange external code" error happens at step 6, which means Apple's callback to Supabase is failing. This is why the Supabase URL must be configured in Apple Developer Console.

## Need Help?

If you're still experiencing issues:
1. Check the browser console for detailed error messages
2. Check your server logs for backend errors
3. Verify all URLs use `https://` in production (not `http://`)
4. Ensure your domain is properly configured in both Supabase and Apple Developer Console
