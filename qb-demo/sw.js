// Service Worker — mocks all Metabase API calls so the QB runs without a backend.

const MOCK_SETTINGS = {
  "version": { "tag": "v0.50.0", "date": "2024-01-01", "src_hash": "abc", "hash": "abc" },
  "setup-token": null,
  "has-user-setup": true,
  "site-name": "Query Builder Demo",
  "site-url": self.location.origin + self.registration.scope.replace(/\/$/, ""),
  "enable-xrays": true,
  "enable-nested-queries": true,
  "enable-embedding": false,
  "enable-public-sharing": false,
  "token-features": {},
  "premium-features": {},
  "anon-tracking-enabled": false,
  "google-auth-enabled": false,
  "ldap-enabled": false,
  "password-complexity": { "total": 6, "digit": 1 },
  "session-timeout": null,
  "search-typeahead-enabled": true,
  "application-name": "Query Builder Demo",
  "application-colors": {},
  "application-font": "Lato",
  "application-font-files": [],
  "application-favicon-url": "app/assets/img/favicon.ico",
  "available-fonts": [],
  "available-locales": [["en", "English"]],
  "available-timezones": ["UTC", "Europe/Paris", "US/Eastern"],
  "custom-geojson": {
    "us_states": { "name": "United States", "url": "app/assets/geojson/us-states.json", "region_key": "STATE", "region_name": "NAME", "builtin": true },
    "world_countries": { "name": "World", "url": "app/assets/geojson/world.json", "region_key": "ISO_A2", "region_name": "NAME", "builtin": true }
  },
  "engines": { "h2": { "driver-name": "H2", "details-fields": [], "source": { "type": "official", "contact": null }, "superseded-by": null, "extra-info": null } },
  "show-metabot": false,
  "enable-content-management": false,
  "subscription-allowed-domains": null,
  "uploads-enabled": false,
  "uploads-database-id": null,
  "uploads-schema-name": null,
  "uploads-table-prefix": null,
  "cloud-gateway-ips": null,
  "deprecation-notice-version": null,
  "start-of-week": "sunday",
  "report-timezone-short": "UTC",
  "report-timezone-long": "UTC",
  "enable-actions": true,
  "enable-browse-data-filters": false,
  "is-hosted?": false,
  "airgap-enabled": false,
  "landing-page": "",
  "redirect-all-requests-to-https": false,
  "enable-audit-app?": false,
};

const MOCK_USER = {
  "id": 1,
  "email": "demo@example.com",
  "first_name": "Demo",
  "last_name": "User",
  "common_name": "Demo User",
  "locale": null,
  "google_auth": false,
  "ldap_auth": false,
  "is_active": true,
  "is_qbnewb": false,
  "is_superuser": true,
  "date_joined": "2024-01-01T00:00:00.000Z",
  "last_login": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z",
  "personal_collection_id": 1,
  "custom_homepage": null,
  "sso_source": null,
  "login_attributes": null,
  "group_ids": [1, 2],
  "has_invited_second_user": true,
  "has_question_and_dashboard": true,
};

function makeField(id, tableId, name, displayName, baseType, semanticType, extra) {
  return {
    "id": id,
    "table_id": tableId,
    "name": name,
    "display_name": displayName,
    "description": null,
    "base_type": baseType,
    "effective_type": baseType,
    "semantic_type": semanticType,
    "active": true,
    "position": 0,
    "preview_display": true,
    "visibility_type": "normal",
    "has_field_values": semanticType === "type/Category" ? "list" : "none",
    "fk_target_field_id": null,
    "settings": null,
    "dimensions": [],
    "dimension_options": [],
    "default_dimension_option": null,
    "fingerprint": null,
    "database_required": false,
    "database_indexed": false,
    "custom_position": null,
    "coercion_strategy": null,
    "nfc_path": null,
    ...(extra || {}),
  };
}

function makeTable(id, dbId, name, displayName, schema, fields) {
  return {
    "id": id,
    "db_id": dbId,
    "name": name,
    "display_name": displayName,
    "description": null,
    "schema": schema,
    "schema_name": schema,
    "active": true,
    "is_upload": false,
    "visibility_type": null,
    "field_order": "database",
    "initial_sync_status": "complete",
    "show_in_getting_started": false,
    "entity_type": "entity/GenericTable",
    "metrics": [],
    "segments": [],
    "fields": fields,
  };
}

// --- ORDERS table (id: 2) ---
const ORDERS_FIELDS = [
  makeField(11, 2, "ID",         "ID",         "type/BigInteger", "type/PK"),
  makeField(15, 2, "USER_ID",    "User ID",    "type/Integer",    "type/FK", { fk_target_field_id: 32 }),
  makeField(9,  2, "PRODUCT_ID", "Product ID", "type/Integer",    "type/FK", { fk_target_field_id: 3  }),
  makeField(16, 2, "SUBTOTAL",   "Subtotal",   "type/Float",      "type/Price"),
  makeField(10, 2, "TAX",        "Tax",        "type/Float",      "type/Cost"),
  makeField(13, 2, "TOTAL",      "Total",      "type/Float",      "type/Price"),
  makeField(17, 2, "DISCOUNT",   "Discount",   "type/Float",      "type/Discount"),
  makeField(14, 2, "CREATED_AT", "Created At", "type/DateTime",   "type/CreationTimestamp"),
  makeField(12, 2, "QUANTITY",   "Quantity",   "type/Integer",    "type/Quantity"),
];

// --- PEOPLE table (id: 5) ---
const PEOPLE_FIELDS = [
  makeField(32, 5, "ID",         "ID",         "type/BigInteger", "type/PK"),
  makeField(42, 5, "ADDRESS",    "Address",    "type/Text",       "type/Address"),
  makeField(37, 5, "EMAIL",      "Email",      "type/Text",       "type/Email"),
  makeField(34, 5, "PASSWORD",   "Password",   "type/Text",       "type/SerializedJSON"),
  makeField(39, 5, "NAME",       "Name",       "type/Text",       "type/Name"),
  makeField(31, 5, "CITY",       "City",       "type/Text",       "type/City"),
  makeField(40, 5, "LONGITUDE",  "Longitude",  "type/Float",      "type/Longitude"),
  makeField(33, 5, "STATE",      "State",      "type/Text",       "type/State"),
  makeField(36, 5, "SOURCE",     "Source",     "type/Text",       "type/Category", { has_field_values: "list" }),
  makeField(35, 5, "BIRTH_DATE", "Birth Date", "type/Date",       "type/Birthdate"),
  makeField(43, 5, "ZIP",        "Zip",        "type/Text",       "type/ZipCode"),
  makeField(41, 5, "LATITUDE",   "Latitude",   "type/Float",      "type/Latitude"),
  makeField(38, 5, "CREATED_AT", "Created At", "type/DateTime",   "type/CreationTimestamp"),
];

// --- PRODUCTS table (id: 1) ---
const PRODUCTS_FIELDS = [
  makeField(3,  1, "ID",         "ID",         "type/BigInteger", "type/PK"),
  makeField(5,  1, "EAN",        "EAN",        "type/Text",       "type/SerializedJSON"),
  makeField(8,  1, "TITLE",      "Title",      "type/Text",       "type/Title"),
  makeField(1,  1, "CATEGORY",   "Category",   "type/Text",       "type/Category", { has_field_values: "list" }),
  makeField(4,  1, "VENDOR",     "Vendor",     "type/Text",       "type/Company"),
  makeField(7,  1, "PRICE",      "Price",      "type/Float",      "type/Price"),
  makeField(2,  1, "RATING",     "Rating",     "type/Float",      "type/Score"),
  makeField(6,  1, "CREATED_AT", "Created At", "type/DateTime",   "type/CreationTimestamp"),
];

// --- REVIEWS table (id: 8) ---
const REVIEWS_FIELDS = [
  makeField(67, 8, "ID",         "ID",         "type/BigInteger", "type/PK"),
  makeField(68, 8, "PRODUCT_ID", "Product ID", "type/Integer",    "type/FK", { fk_target_field_id: 3 }),
  makeField(69, 8, "REVIEWER",   "Reviewer",   "type/Text",       "type/Author"),
  makeField(66, 8, "RATING",     "Rating",     "type/Integer",    "type/Score"),
  makeField(70, 8, "BODY",       "Body",       "type/Text",       "type/Description"),
  makeField(71, 8, "CREATED_AT", "Created At", "type/DateTime",   "type/CreationTimestamp"),
];

const ORDERS_TABLE  = makeTable(2, 1, "ORDERS",   "Orders",   "PUBLIC", ORDERS_FIELDS);
const PEOPLE_TABLE  = makeTable(5, 1, "PEOPLE",   "People",   "PUBLIC", PEOPLE_FIELDS);
const PRODUCTS_TABLE = makeTable(1, 1, "PRODUCTS", "Products", "PUBLIC", PRODUCTS_FIELDS);
const REVIEWS_TABLE = makeTable(8, 1, "REVIEWS",  "Reviews",  "PUBLIC", REVIEWS_FIELDS);

const ALL_TABLES = [ORDERS_TABLE, PEOPLE_TABLE, PRODUCTS_TABLE, REVIEWS_TABLE];

const SAMPLE_DB = {
  "id": 1,
  "name": "Sample Database",
  "engine": "h2",
  "description": null,
  "is_sample": true,
  "is_full_sync": true,
  "is_on_demand": false,
  "settings": null,
  "timezone": "UTC",
  "auto_run_queries": true,
  "metadata_sync_schedule": "0 50 * * * ? *",
  "cache_field_values_schedule": "0 50 0 * * ? *",
  "updated_at": "2024-01-01T00:00:00.000Z",
  "created_at": "2024-01-01T00:00:00.000Z",
  "creator_id": 1,
  "initial_sync_status": "complete",
  "cache_ttl": null,
  "dbms_version": { "flavor": "H2", "version": "2.2", "semantic-version": [2, 2] },
  "features": [
    "basic-aggregations",
    "standard-deviation-aggregations",
    "foreign-keys",
    "right-join",
    "left-join",
    "native-parameters",
    "nested-queries",
    "expressions",
    "case-sensitivity-string-filter-options",
    "binning",
    "date-arithmetics",
    "now",
    "percentile-aggregations",
    "advanced-math-expressions",
    "datetime-diff",
    "convert-timezone",
  ],
  "tables": ALL_TABLES.map(({ fields: _f, ...t }) => t),
};

const DB_METADATA = { ...SAMPLE_DB, tables: ALL_TABLES };

const ROOT_COLLECTION = {
  "id": "root",
  "name": "Our analytics",
  "description": null,
  "can_write": true,
  "is_personal": false,
  "authority_level": null,
  "archived": false,
  "effective_location": null,
  "effective_ancestors": [],
  "here": ["collection", "dashboard", "pulse"],
  "below": ["collection"],
};

const PERMISSIONS_GRAPH = {
  "revision": 1,
  "groups": {
    "1": { "1": { "data": { "native": "write", "schemas": "all" } } },
    "2": { "1": { "data": { "native": "write", "schemas": "all" } } },
  },
};

// ---- Route matching --------------------------------------------------------

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json" },
  });
}

function matchPath(pathname, pattern) {
  const re = new RegExp("^" + pattern.replace(/:[^/]+/g, "([^/]+)") + "(/.*)?$");
  return re.test(pathname);
}

function mockResponse(pathname, method) {
  // session / auth
  if (pathname.endsWith("/api/session/properties") && method === "GET")  return jsonResponse(MOCK_SETTINGS);
  if (pathname.endsWith("/api/session")             && method === "POST") return jsonResponse({ id: "mock-session" });
  if (pathname.endsWith("/api/session")             && method === "DELETE") return new Response(null, { status: 204 });
  if (pathname.endsWith("/api/user/current")        && method === "GET")  return jsonResponse(MOCK_USER);
  if (pathname.match(/\/api\/user\/\d+\/password$/) && method === "PUT")  return jsonResponse({});

  // database
  if (pathname.endsWith("/api/database") && method === "GET")
    return jsonResponse({ data: [SAMPLE_DB], total: 1 });
  if (pathname.match(/\/api\/database\/1\/metadata$/) && method === "GET")
    return jsonResponse(DB_METADATA);
  if (pathname.match(/\/api\/database\/1$/) && method === "GET")
    return jsonResponse(SAMPLE_DB);
  if (pathname.match(/\/api\/database\/1\/schema\/PUBLIC$/) && method === "GET")
    return jsonResponse(ALL_TABLES.map(({ fields: _f, ...t }) => t));
  if (pathname.match(/\/api\/database\/1\/schemas$/) && method === "GET")
    return jsonResponse(["PUBLIC"]);
  if (pathname.match(/\/api\/database\/1\/fields$/) && method === "GET")
    return jsonResponse([...ORDERS_FIELDS, ...PEOPLE_FIELDS, ...PRODUCTS_FIELDS, ...REVIEWS_FIELDS]);

  // tables
  if (pathname.match(/\/api\/table\/\d+\/query_metadata$/) && method === "GET") {
    const id = parseInt(pathname.match(/\/api\/table\/(\d+)\//)[1]);
    const t = ALL_TABLES.find(t => t.id === id);
    return t ? jsonResponse(t) : jsonResponse({}, 404);
  }
  if (pathname.match(/\/api\/table\/\d+$/) && method === "GET") {
    const id = parseInt(pathname.match(/\/api\/table\/(\d+)$/)[1]);
    const t = ALL_TABLES.find(t => t.id === id);
    return t ? jsonResponse(t) : jsonResponse({}, 404);
  }
  if (pathname.match(/\/api\/table\/\d+\/fks$/) && method === "GET")
    return jsonResponse([]);

  // fields
  if (pathname.match(/\/api\/field\/\d+\/values$/) && method === "GET") {
    const id = parseInt(pathname.match(/\/api\/field\/(\d+)\//)[1]);
    const allFields = [...ORDERS_FIELDS, ...PEOPLE_FIELDS, ...PRODUCTS_FIELDS, ...REVIEWS_FIELDS];
    const f = allFields.find(f => f.id === id);
    if (!f) return jsonResponse({ field_id: id, values: [], has_more_values: false });
    if (f.name === "CATEGORY")
      return jsonResponse({ field_id: id, values: [["Doohickey"],["Gadget"],["Gizmo"],["Widget"]], has_more_values: false });
    if (f.name === "SOURCE")
      return jsonResponse({ field_id: id, values: [["Affiliate"],["Facebook"],["Google"],["Organic"],["Twitter"]], has_more_values: false });
    return jsonResponse({ field_id: id, values: [], has_more_values: false });
  }
  if (pathname.match(/\/api\/field\/\d+\/search\/\d+$/) && method === "GET")
    return jsonResponse([]);
  if (pathname.match(/\/api\/field\/\d+\/related$/) && method === "GET")
    return jsonResponse({ "table": [], "metrics": [], "segments": [] });
  if (pathname.match(/\/api\/field\/\d+$/) && method === "GET") {
    const id = parseInt(pathname.match(/\/api\/field\/(\d+)$/)[1]);
    const allFields = [...ORDERS_FIELDS, ...PEOPLE_FIELDS, ...PRODUCTS_FIELDS, ...REVIEWS_FIELDS];
    const f = allFields.find(f => f.id === id);
    return f ? jsonResponse(f) : jsonResponse({}, 404);
  }

  // dataset (query execution — return empty results)
  if (pathname.endsWith("/api/dataset") && method === "POST")
    return jsonResponse({
      "data": { "rows": [], "cols": [], "rows_truncated": 0, "native_form": { "query": "SELECT 1", "params": null } },
      "row_count": 0,
      "status": "completed",
      "context": "ad-hoc",
      "running_time": 1,
      "started_at": new Date().toISOString(),
    });

  // collections
  if (pathname.endsWith("/api/collection/root") && method === "GET")
    return jsonResponse(ROOT_COLLECTION);
  if (pathname.endsWith("/api/collection/root/items") && method === "GET")
    return jsonResponse({ "data": [], "total": 0, "models": [] });
  if (pathname.endsWith("/api/collection") && method === "GET")
    return jsonResponse([ROOT_COLLECTION]);
  if (pathname.match(/\/api\/collection\/\d+\/items$/) && method === "GET")
    return jsonResponse({ "data": [], "total": 0, "models": [] });

  // cards / questions
  if (pathname.endsWith("/api/card") && method === "GET")
    return jsonResponse({ "data": [], "total": 0 });
  if (pathname.match(/\/api\/card\/\d+$/) && method === "GET")
    return jsonResponse({}, 404);
  if (pathname.endsWith("/api/card") && method === "POST")
    return jsonResponse({ "id": 1, "name": "New Question", "dataset_query": {} }, 201);

  // permissions
  if (pathname.endsWith("/api/permissions/graph") && method === "GET")
    return jsonResponse(PERMISSIONS_GRAPH);
  if (pathname.endsWith("/api/permissions/group") && method === "GET")
    return jsonResponse([{ "id": 1, "name": "All Users" }, { "id": 2, "name": "Administrators" }]);

  // misc
  if (pathname.endsWith("/api/user") && method === "GET")
    return jsonResponse({ "data": [MOCK_USER], "total": 1 });
  if (pathname.endsWith("/api/setting") && method === "GET")
    return jsonResponse([]);
  if (pathname.endsWith("/api/activity") && method === "GET")
    return jsonResponse([]);
  if (pathname.endsWith("/api/bookmark") && method === "GET")
    return jsonResponse([]);
  if (pathname.match(/\/api\/bookmark\//) && method === "POST")
    return jsonResponse({});
  if (pathname.match(/\/api\/bookmark\//) && method === "DELETE")
    return new Response(null, { status: 204 });
  if (pathname.endsWith("/api/search") && method === "GET")
    return jsonResponse({ "data": [], "total": 0, "models": [], "available_models": [], "table_db_id": null });
  if (pathname.endsWith("/api/automagic-dashboards/database/1/start") && method === "GET")
    return jsonResponse({});
  if (pathname.match(/\/api\/native-query-snippet/))
    return jsonResponse({ "data": [], "total": 0 });
  if (pathname.match(/\/api\/timeline/))
    return jsonResponse([]);
  if (pathname.match(/\/api\/pulse/))
    return jsonResponse([]);
  if (pathname.match(/\/api\/alert/))
    return jsonResponse([]);
  if (pathname.match(/\/api\/segment/))
    return jsonResponse({ "data": [], "total": 0 });
  if (pathname.match(/\/api\/metric/))
    return jsonResponse({ "data": [], "total": 0 });
  if (pathname.match(/\/api\/dashboard/))
    return jsonResponse({ "data": [], "total": 0 });
  if (pathname.match(/\/api\/task/))
    return jsonResponse({ "data": [], "total": 0 });
  if (pathname.match(/\/api\/revision/))
    return jsonResponse([]);
  if (pathname.match(/\/api\/setting\//))
    return jsonResponse({});
  if (pathname.match(/\/api\/geojson/))
    return jsonResponse({});
  if (pathname.match(/\/api\/premium-features\/token/))
    return jsonResponse({});

  return null; // not matched — pass through
}

// ---- Service Worker lifecycle ----------------------------------------------

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const pathname = url.pathname;

  // Only intercept requests that look like Metabase API calls
  if (!pathname.includes("/api/")) return;

  const mock = mockResponse(pathname, event.request.method);
  if (mock) {
    event.respondWith(mock instanceof Promise ? mock : Promise.resolve(mock));
  }
});
