# MySQL2 Configuration Fix

## Problem
The application was showing a warning about an invalid configuration option `acquireTimeout` being passed to MySQL2 connections:

```
Ignoring invalid configuration option passed to Connection: acquireTimeout. This is currently a warning, but in future versions of MySQL2, an error will be thrown if you pass an invalid configuration option to a Connection
```

## Root Cause
The MySQL2 library has different configuration option names compared to the original `mysql` library. The application was using:
- `acquireTimeout` (invalid for MySQL2)
- `timeout` (too generic for MySQL2)

## Solution
Updated the configuration to use MySQL2-compatible options:

### Changes Made

1. **Updated `src/config/index.js`**:
   - Changed `DB_ACQUIRE_TIMEOUT` to `DB_ACQUIRE_TIMEOUT_MILLIS`
   - Changed `DB_TIMEOUT` to `DB_CONNECT_TIMEOUT`
   - Updated `dbOptions` to use:
     - `acquireTimeoutMillis` instead of `acquireTimeout`
     - `connectTimeout` instead of `timeout`

2. **Updated `src/database/mysqlDatabase.js`**:
   - Separated connection config from pool options
   - Created `poolOptions` object with MySQL2-compatible settings
   - Removed the spread of potentially incompatible `dbOptions`

### MySQL2 Compatible Options

| Old Option | New Option | Description |
|------------|------------|-------------|
| `acquireTimeout` | `acquireTimeoutMillis` | Time to wait for a connection from the pool (in milliseconds) |
| `timeout` | `connectTimeout` | Time to wait for initial connection (in milliseconds) |
| `connectionLimit` | `connectionLimit` | Maximum number of connections in the pool (unchanged) |

### Environment Variables

If you have these environment variables set, update them:
```bash
# Old (will be ignored)
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEOUT=60000

# New (MySQL2 compatible)
DB_ACQUIRE_TIMEOUT_MILLIS=60000
DB_CONNECT_TIMEOUT=60000
```

## Testing

Run the test script to verify the fix:
```bash
npm run test:mysql
```

This will:
1. Load the configuration
2. Initialize the MySQL2 connection
3. Test a simple query
4. Display connection stats
5. Close the connection

If successful, you should see no warnings about invalid configuration options.

## Benefits

- ✅ Eliminates MySQL2 configuration warnings
- ✅ Future-proofs the application for newer MySQL2 versions
- ✅ Uses proper MySQL2 connection pool options
- ✅ Maintains the same timeout behavior with correct option names
