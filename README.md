# NE TaskCompass

Field force automation and CRM for National Enterprises (neurosurgery). Built on Frappe 14 + ERPNext.

## Surfaces

- **NE LiveTrack** management portal: `/livetrack` (Sales Manager, Management, Super Admin)
- **Frappe Desk** workspace **NE TaskCompass** for Super Admin master data
- **Mobile app** is out of this phase. APIs are in [`postman/NE_TaskCompass.postman_collection.json`](postman/NE_TaskCompass.postman_collection.json)

## People model

Does **not** add fields on User. Identity is:

`User` ← `Employee.user_id` ← `Sales Person.employee`

TaskCompass documents link to **Sales Person**. Region is ERPNext **Territory**, stored on Sales Person as custom field `tc_territory`.

## Roles

- TC Salesperson — APIs only
- TC Sales Manager — portal, own region
- TC Management — portal, all (no delete)
- TC Super Admin — portal + delete

## Local

```bash
bench --site site1.local migrate
cd apps/ne_taskcompass/frontend && npm install && npm run build
bench --site site1.local clear-cache
```

Open `/livetrack` after signing in as a manager.

## Test flow

1. Give your user **TC Super Admin** (or TC Management).
2. Create **Territory** → **Employee** (`user_id` = User) → **Sales Person** (`employee`, `tc_territory`). Give the field user **TC Salesperson**.
3. Create **Item** (or let TC Product create one) → **TC Product** linked to that Item → **TC Hospital** → **TC Doctor** (`Assigned To` = Sales Person).
4. Open LiveTrack at `/livetrack` (Desk shortcut or the URL). Approve doctors, set monthly targets, assign follow-ups.
5. Field APIs (Postman): `save_plan` (creates a visit per row) → `visits.checkin` → `visits.checkout`. Pending/Missed rows can be updated with `save_plan` or `visits.update_visit`. After check-in the row is locked.

## Product seed

Sixteen catalogue products from the client target sheet are created on migrate if missing.
