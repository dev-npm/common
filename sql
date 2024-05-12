-- Step 1: Dynamic SQL Generation
DO $$
DECLARE
    category_list text;
    dynamic_sql text;
BEGIN
    -- Get distinct product names from your sales table
    SELECT string_agg(DISTINCT product, ',' ORDER BY product) 
    INTO category_list
    FROM daily_sales; 

    -- Build the dynamic SQL query
    dynamic_sql := format(
        'SELECT * FROM crosstab(
            ''SELECT date, product, sales 
             FROM daily_sales
             ORDER BY 1, 2'',
            ''VALUES (%s)''
         ) AS ct (date date, %s);',
         replace(category_list, ',', '), ('''),  -- Convert to VALUES format
         replace(category_list, ',', ' int, ') || ' int' -- Define columns
    );

    -- Step 2: Execute Dynamic SQL
    CREATE TEMP TABLE pivoted_sales ON COMMIT DROP AS  
    EXECUTE dynamic_sql;
END $$;

-- Now you can query the temporary table
SELECT * FROM pivoted_sales;
