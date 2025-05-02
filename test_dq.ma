
# 📘 Final Database Schema and Table Descriptions

This schema supports quote versioning, cost model management, and auditability across projects, companies, and organizations.

---

## 🏢 1. `company`

- **Purpose**: Represents a customer or business entity.
- **Fields**:
  - `company_id` (PK)
  - `company_name`
  - `company_description`
  - `row_status_id` (FK to `row_status`)

---

## 🏷️ 2. `company_category`

- **Purpose**: Categories such as "Cloud", "DevOps", etc.
- **Fields**:
  - `category_id` (PK)
  - `category_name`

---

## 🔗 3. `company_category_mapping`

- **Purpose**: Many-to-many between company and category.
- **Fields**:
  - `company_id` (FK)
  - `category_id` (FK)

---

## 🏛️ 4. `organization`

- **Purpose**: Internal or external organization entity.
- **Fields**:
  - `organization_id` (PK)
  - `organization_name`
  - `type_id` (e.g. internal/external)
  - `tier_id` (1–5)
  - `row_status_id`

---

## 📇 5. `organization_contact`

- **Purpose**: Contact person tied to an organization.
- **Fields**:
  - `contact_id` (PK)
  - `organization_id` (FK)
  - `contact_name`, `contact_email`

---

## 🧭 6. `process_node`

- **Purpose**: Technical nodes/processes like Node1, Node2.
- **Fields**:
  - `process_node_id`, `node_name`, `row_status_id`

---

## 📂 7. `project`

- **Purpose**: Logical grouping of quotes by organization, contact, and process.
- **Fields**:
  - `project_id`, `project_name`
  - `organization_id`, `contact_id`, `process_node_id`

---

## 📊 8. `cost_model`

- **Purpose**: Represents a pricing model.
- **Fields**:
  - `cost_model_id`, `model_name`
  - `estimated_cost`
  - `active_revision_id` (FK to `cost_model_revision`)
  - `is_available_for_quoting`, `row_status_id`

---

## 🧾 9. `cost_model_revision`

- **Purpose**: Stores cost model changes with full matrix snapshot.
- **Fields**:
  - `revision_id`, `cost_model_id`, `revision_number`
  - `company_id`, `category_id`
  - `cost_matrix_json`
  - `comments`, `created_by`

---

## 📜 10. `cost_model_revision_change_log`

- **Purpose**: Tracks changes to `active_revision_id`.
- **Fields**:
  - `log_id`, `cost_model_id`
  - `old_revision_id`, `new_revision_id`
  - `changed_by`, `changed_at`

---

## 💼 11. `quote`

- **Purpose**: Master container for all quote versions.
- **Fields**:
  - `quote_id`, `quote_code`
  - `project_id`, `organization_id`
  - `active_version_id` (FK to `quote_version`)

---

## 🧾 12. `quote_version`

- **Purpose**: Tracks quote changes over time.
- **Fields**:
  - `version_id`, `quote_id`, `version_number`
  - `status_id`, `created_by`, `comments`

---

## 📦 13. `quote_item`

- **Purpose**: Line-level cost entries per quote version.
- **Fields**:
  - `quote_item_id`, `version_id`
  - `cost_model_id`, `captured_revision_id`
  - `quantity`, `unit_price`, `total_amount`

---

## 📌 14. `quote_status`

- **Purpose**: Defines states like Draft, Review, Accepted.
- **Fields**:
  - `status_id`, `status_name`

---

## 🔁 15. `row_status`

- **Purpose**: Soft delete control.
- **Fields**:
  - `status_id`, `status_name` (Active/Inactive)
