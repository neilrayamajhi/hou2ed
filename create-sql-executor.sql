-- Create a helper function to execute arbitrary SQL (admin only)
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
  RETURN 'SUCCESS';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- Grant execute only to service_role
REVOKE ALL ON FUNCTION exec_sql FROM PUBLIC;
GRANT EXECUTE ON FUNCTION exec_sql TO service_role;

