CREATE OR REPLACE FUNCTION public.set_inbound_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.inbound_token IS NULL THEN
    NEW.inbound_token := encode(extensions.gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$function$;