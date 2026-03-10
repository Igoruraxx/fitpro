# Testing the Database Schema Rebuild

This document provides instructions for testing the database schema rebuild safely.

## ⚠️ Important: Data Loss Warning

The migration file `0004_rebuild_schema_from_scratch.sql` will **DROP ALL EXISTING TABLES**. This means:
- All data will be permanently deleted
- There is no undo
- You cannot recover data after running this migration

## 🧪 Safe Testing Approach

### Option 1: Use a Test Database (Recommended)

1. **Create a separate test database**:
   ```bash
   # For local PostgreSQL
   createdb fitpro_test
   
   # For Supabase - create a new project or use a test project
   ```

2. **Configure test DATABASE_URL**:
   ```bash
   # Copy your .env file
   cp .env .env.backup
   
   # Update DATABASE_URL to point to test database
   export DATABASE_URL="postgresql://user:pass@host:5432/fitpro_test"
   ```

3. **Run the migration**:
   ```bash
   npm run db:rebuild
   ```

4. **Verify the result**:
   - Script will show all tables created
   - Connect to database and verify structure
   - Run test queries

### Option 2: Review Migration First (No Execution)

1. **Read the migration file**:
   ```bash
   cat drizzle/migrations/0004_rebuild_schema_from_scratch.sql
   ```

2. **Understand what will happen**:
   - Step 1: DROP all tables
   - Step 2: CREATE enums
   - Step 3-10: CREATE tables
   - Step 11: CREATE indexes
   - Step 12: ENABLE RLS
   - Step 13: CREATE RLS policies
   - Step 14: CREATE triggers

3. **Verify against your current schema**:
   ```sql
   -- List current tables
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   
   -- Check current policies
   SELECT * FROM pg_policies;
   ```

### Option 3: Backup First (Production)

1. **Export current data**:
   ```bash
   # Using pg_dump
   pg_dump -h host -U user -d fitpro > backup_$(date +%Y%m%d_%H%M%S).sql
   
   # Using Supabase CLI
   supabase db dump -f backup.sql
   ```

2. **Verify backup**:
   ```bash
   # Check file size
   ls -lh backup*.sql
   
   # Verify content (should see CREATE TABLE statements and INSERT statements)
   head -100 backup*.sql
   ```

3. **Run migration**:
   ```bash
   npm run db:rebuild
   ```

4. **If needed, restore**:
   ```bash
   # Restore from backup
   psql -h host -U user -d fitpro < backup_YYYYMMDD_HHMMSS.sql
   ```

## 🔍 Manual Migration Steps (Advanced)

If you want to apply the migration manually without the script:

```bash
# 1. Connect to database
psql $DATABASE_URL

# 2. Copy and paste the SQL from the migration file
# Or execute it directly:
\i drizzle/migrations/0004_rebuild_schema_from_scratch.sql

# 3. Verify tables were created
\dt

# 4. Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

# 5. List policies
\d+ users
```

## ✅ Verification Checklist

After running the migration, verify:

### Tables Created
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

Expected tables:
- [ ] appointments
- [ ] authTokens
- [ ] bioimpedanceExams
- [ ] bodyMeasurements
- [ ] clients
- [ ] progressPhotos
- [ ] transactions
- [ ] users

### RLS Enabled
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

All tables should have `rowsecurity = true`.

### Policies Created
```sql
SELECT schemaname, tablename, policyname FROM pg_policies ORDER BY tablename, policyname;
```

Should have 24 policies (3 per table on average).

### Indexes Created
```sql
SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;
```

Should have 34+ indexes (including primary keys).

### Foreign Keys
```sql
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
```

Should show proper relationships.

## 🧪 Testing Application Functionality

After migration, test all features:

### 1. Authentication
- [ ] Register new user
- [ ] Confirm email
- [ ] Login
- [ ] Logout
- [ ] Reset password

### 2. Profile
- [ ] View profile
- [ ] Update profile
- [ ] Upload photo
- [ ] Update specialties

### 3. Clients
- [ ] Create client
- [ ] List clients
- [ ] View client details
- [ ] Update client
- [ ] Delete client

### 4. Appointments
- [ ] Create appointment
- [ ] List appointments (day/week/month/list views)
- [ ] Update appointment status
- [ ] Create recurring appointment
- [ ] Delete appointment

### 5. Evolution
- [ ] Add body measurements
- [ ] View measurements history
- [ ] Upload progress photo
- [ ] View photo gallery
- [ ] Add bioimpedance exam

### 6. Finances
- [ ] Add income
- [ ] Add expense
- [ ] View transactions
- [ ] Update transaction status
- [ ] View monthly report

### 7. Admin (if admin user)
- [ ] View all trainers
- [ ] Grant PRO plan
- [ ] View metrics
- [ ] Impersonate trainer

## 🐛 Common Issues

### Issue: "RLS policies blocking queries"

**Symptom**: Queries return no results even though data exists.

**Cause**: `auth.uid()` is not being set in the database context.

**Solution**: 
1. Check that JWT token is being passed correctly
2. Verify the token includes user ID
3. Ensure Supabase auth is configured correctly
4. For direct SQL queries, set the user context:
   ```sql
   SET LOCAL "request.jwt.claims" = '{"sub": "1"}';
   ```

### Issue: "Cannot insert data"

**Symptom**: INSERT statements fail with permission denied.

**Cause**: RLS policy `WITH CHECK` clause is blocking the insert.

**Solution**:
1. Check that `trainerId` matches authenticated user ID
2. Verify `auth.uid()` returns correct value
3. For testing, you can temporarily disable RLS:
   ```sql
   ALTER TABLE tablename DISABLE ROW LEVEL SECURITY;
   ```

### Issue: "Migration script fails"

**Symptom**: Script exits with error.

**Cause**: Various - database connection, permissions, syntax error.

**Solution**:
1. Check database connection string
2. Verify user has CREATE/DROP privileges
3. Check script logs for specific error
4. Try running SQL manually to isolate issue

## 📊 Performance Testing

After migration, verify performance:

```sql
-- Test query performance
EXPLAIN ANALYZE SELECT * FROM appointments 
WHERE "trainerId" = 1 AND date >= CURRENT_DATE;

-- Should use index: idx_appointments_trainerId_date

-- Test RLS overhead
EXPLAIN ANALYZE SELECT * FROM clients WHERE "trainerId" = 1;

-- Should show fast execution with index
```

## 🔄 Rollback Plan

If you need to rollback:

### Option 1: Restore from Backup
```bash
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

### Option 2: Re-apply Old Migrations
```bash
# If you have old migrations, re-run them in order
drizzle-kit migrate
```

### Option 3: Manual Recreation
Use the old schema files to recreate tables manually.

## 📝 Success Criteria

Migration is successful when:
- ✅ All 8 tables exist
- ✅ All 11 enums exist
- ✅ All 24 RLS policies are active
- ✅ All 34 indexes are created
- ✅ All foreign keys are configured
- ✅ All triggers are working
- ✅ Application functionality works end-to-end
- ✅ Multi-tenancy isolation is verified
- ✅ Performance is acceptable

## 🎓 Next Steps After Successful Migration

1. **Seed data** (if starting fresh):
   ```bash
   # Create admin user
   # Create test trainer
   # Create test clients
   ```

2. **Update documentation**:
   - Document any custom changes
   - Update API documentation if needed

3. **Monitor performance**:
   - Check query execution times
   - Monitor slow query log
   - Optimize indexes if needed

4. **Backup schedule**:
   - Set up automated backups
   - Test restore procedure
   - Document backup location

5. **Security audit**:
   - Verify RLS policies are working
   - Test with different user roles
   - Ensure data isolation

---

**Remember**: Always test in a non-production environment first!
