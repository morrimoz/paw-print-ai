-- Map credit packages to Stripe price IDs so the webhook knows which to credit
ALTER TABLE public.credit_packages ADD COLUMN IF NOT EXISTS price_lookup_key text UNIQUE;

UPDATE public.credit_packages SET price_lookup_key = 'treats_starter_v1' WHERE name = 'Starter Pack';
UPDATE public.credit_packages SET price_lookup_key = 'treats_enthusiast_v1' WHERE name = 'Enthusiast Pack';
UPDATE public.credit_packages SET price_lookup_key = 'treats_pro_v1' WHERE name = 'Pro Pack';

-- Allow service role to update profiles (webhook needs to credit treats)
CREATE POLICY "Service role can manage profiles"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Allow service role to manage orders (webhook creates orders)
CREATE POLICY "Service role can manage orders"
  ON public.orders FOR ALL
  USING (auth.role() = 'service_role');

-- Allow updating own orders so user can see status changes (webhook uses service role anyway)
CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id);

-- Track Stripe checkout sessions on orders for idempotency
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text UNIQUE;