-- Xóa user từ UI: không làm hỏng dữ liệu người khác
-- - Cột FK cho phép NULL (vd: opportunities.sale_phu_trach) → ON DELETE SET NULL
-- - Cột FK NOT NULL thuộc user (vd: work_sessions.user_id) → ON DELETE CASCADE (chỉ xóa record của user đó)
-- Chạy trong Supabase SQL Editor

-- 1) Xem FK trỏ vào users
SELECT
  c.conname AS constraint_name,
  c.conrelid::regclass::text AS child_table,
  a.attname AS child_column,
  af.attname AS users_column,
  col.is_nullable,
  CASE c.confdeltype
    WHEN 'n' THEN 'SET NULL'
    WHEN 'c' THEN 'CASCADE'
    ELSE 'OTHER'
  END AS on_delete
FROM pg_constraint c
JOIN pg_attribute a
  ON a.attrelid = c.conrelid
 AND a.attnum = ANY (c.conkey)
 AND NOT a.attisdropped
JOIN pg_attribute af
  ON af.attrelid = c.confrelid
 AND af.attnum = ANY (c.confkey)
 AND NOT af.attisdropped
JOIN information_schema.columns col
  ON col.table_schema = 'public'
 AND col.table_name = split_part(c.conrelid::regclass::text, '.', 2)
 AND col.column_name = a.attname
WHERE c.contype = 'f'
  AND c.confrelid = 'public.users'::regclass
ORDER BY c.conrelid::regclass::text, c.conname;

-- 2) Sửa FK: nullable → SET NULL, NOT NULL → CASCADE
DO $$
DECLARE
  fk RECORD;
  delete_rule text;
BEGIN
  FOR fk IN
    SELECT
      c.conname AS constraint_name,
      c.conrelid::regclass AS table_name,
      a.attname AS column_name,
      af.attname AS ref_column,
      col.is_nullable
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY (c.conkey)
     AND NOT a.attisdropped
    JOIN pg_attribute af
      ON af.attrelid = c.confrelid
     AND af.attnum = ANY (c.confkey)
     AND NOT af.attisdropped
    JOIN information_schema.columns col
      ON col.table_schema = 'public'
     AND col.table_name = split_part(c.conrelid::regclass::text, '.', 2)
     AND col.column_name = a.attname
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.users'::regclass
  LOOP
    IF fk.is_nullable = 'YES' THEN
      delete_rule := 'ON DELETE SET NULL';
    ELSE
      delete_rule := 'ON DELETE CASCADE';
    END IF;

    BEGIN
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', fk.table_name, fk.constraint_name);
      EXECUTE format(
        'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.users(%I) %s ON UPDATE CASCADE',
        fk.table_name,
        fk.constraint_name,
        fk.column_name,
        fk.ref_column,
        delete_rule
      );
      RAISE NOTICE 'OK %: % %', fk.constraint_name, delete_rule, fk.table_name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Lỗi % (%): %', fk.constraint_name, fk.table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- 3) Hàm xóa user (dự phòng — UI có thể gọi RPC hoặc DELETE trực tiếp sau bước 2)
CREATE OR REPLACE FUNCTION public.delete_user_safe(p_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR btrim(p_user_id) = '' THEN
    RAISE EXCEPTION 'user_id không hợp lệ';
  END IF;

  -- Gỡ phụ trách cơ hội (giữ nguyên opportunity, không xóa)
  UPDATE public.opportunities
  SET sale_phu_trach = NULL
  WHERE sale_phu_trach::text = p_user_id;

  -- Xóa phiên làm việc của user (chỉ data của user này)
  DELETE FROM public.work_sessions
  WHERE user_id::text = p_user_id;

  DELETE FROM public.users
  WHERE user_id::text = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy user_id: %', p_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_safe(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_safe(text) TO authenticated, service_role;
