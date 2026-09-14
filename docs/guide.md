# Indexing Guide & Neon Free Tier Storage Analysis

> This document is the quick-reference companion for database optimization on Neon Postgres.
> For the comprehensive technical breakdown, see [DATABASE_INDEXING_GUIDE.md](file:///d:/Full-Stack_Projects/csec-astu-platform/docs/DATABASE_INDEXING_GUIDE.md).

---

## Key Takeaways

1. **Storage Impact on Neon Free Tier (500 MB Limit)**:
   * **Total Index Storage:** ~4.7 MB to 10 MB across the entire database (~**0.9%** of your free storage).
   * It will **not** exceed your storage limits.

2. **Compute Hour Savings**:
   * Neon limits free accounts to **100 Active Compute Hours/month**.
   * Unindexed queries force Postgres to scan the whole table over the network, keeping the compute engine awake longer.
   * Proper B-Tree and Partial indexes reduce query times from **80ms to 2ms**, letting Neon sleep faster and **saving your compute hours**.

3. **Where to Add Indexes Tomorrow**:
   * **`point_events.member_id`**: For member profiles, timeline, and leaderboard calculations.
   * **`members.google_id`**: For instant OAuth sign-in.
   * **`members.division_id`**: For division scoping and division leaderboards.
   * **`point_events.status` (Partial Index `WHERE status = 'pending'`)**: For the approvals queue without indexing 50,000 resolved rows.
   * **`attendance_records.(session_id, member_id)`**: For fast attendance check-in verification.

4. **Action Plan Ready for Tomorrow**:
   * Migration script draft and model updates are fully prepared in [`docs/DATABASE_INDEXING_GUIDE.md`](file:///d:/Full-Stack_Projects/csec-astu-platform/docs/DATABASE_INDEXING_GUIDE.md).
