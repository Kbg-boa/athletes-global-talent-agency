# 🚀 AGTA Database Setup Guide

## ✅ Completed Steps:
- ✅ Supabase credentials updated in all config files
- ✅ Connection test successful
- ✅ Athlete data prepared

## 🔧 Required Action:

**You need to run the database setup SQL in Supabase:**

1. **Open your browser and go to:** https://supabase.com/dashboard/project/ddssfadzmfspnwcdiohh

2. **Navigate to:** SQL Editor (in the left sidebar)

3. **Copy and paste** the entire contents of `SUPABASE_COMPLETE_SETUP.sql`

4. **Click "Run"** to execute the SQL

## 📋 What the SQL does:
- ✅ Creates missing tables (payments, recruiters, documents)
- ✅ Enables Row Level Security on all tables
- ✅ Creates public access policies (for development)
- ✅ Creates storage bucket for file uploads
- ✅ Adds test data

## 🎯 After running the SQL:

Once you've executed the SQL in Supabase, run this command to add the athletes:

```bash
node add-athletes.js
```

## 🏆 Athletes to be added:
- **Exaucé Ikamba** - Basketball Player (DR Congo) 🇨🇩
- **Victorine Mbussa** - 100m Sprinter (DR Congo) 🇨🇩

## 🌍 Next Steps:
1. Run SQL setup in Supabase Dashboard
2. Add athletes to database
3. Test the application: `npm run dev`
4. Visit `/join` to test athlete registration
5. Check admin dashboard for athlete management

---
**AGTA - Athletes Global Talent Agency**  
*Connecting African Excellence to Global Opportunities*