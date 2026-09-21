# Endpoint Test Report — run 2026-09-21T19-16-30-103Z

Base URL: `http://localhost:4000/api`

**102/104 calls passed.**

## Failures

- `GET /articles/test-article-2026-09-21T19-16-30-103Z` → 404 Expected 200
- `POST /research-assistant/query` → 503 

## Full log

### GET /auth/me
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": null
}
```

### POST /auth/login
**Status:** 200 — **PASS** (Expected 200)

**Request body:**
```json
{
  "email": "admin@example.com",
  "password": "changeme"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "62aade7f-7fac-49f7-b6fc-8d74c2a4c962",
      "name": "Admin",
      "email": "admin@example.com",
      "role": "super_admin",
      "reviewerId": null,
      "permissions": [
        "publications.read",
        "publications.create",
        "publications.update",
        "publications.delete",
        "articles.read",
        "articles.create",
        "articles.update",
        "articles.publish",
        "authors.manage",
        "publishers.manage",
        "volumes.manage",
        "issues.manage",
        "editors.manage",
        "reviewers.manage",
        "reviews.manage",
        "reviews.read",
        "indexing.manage",
        "contacts.read",
        "contacts.manage",
        "seo.read",
        "seo.manage",
        "users.manage",
        "roles.manage"
      ]
    }
  }
}
```

### POST /auth/login
**Status:** 401 — **PASS** (Expected 401)

**Request body:**
```json
{
  "email": "admin@example.com",
  "password": "definitely-wrong"
}
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password."
  }
}
```

### GET /auth/me
**Status:** 200 — **PASS** (Expected 200)

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "62aade7f-7fac-49f7-b6fc-8d74c2a4c962",
    "name": "Admin",
    "email": "admin@example.com",
    "role": "super_admin",
    "reviewerId": null,
    "permissions": [
      "publications.read",
      "publications.create",
      "publications.update",
      "publications.delete",
      "articles.read",
      "articles.create",
      "articles.update",
      "articles.publish",
      "authors.manage",
      "publishers.manage",
      "volumes.manage",
      "issues.manage",
      "editors.manage",
      "reviewers.manage",
      "reviews.manage",
      "reviews.read",
      "indexing.manage",
      "contacts.read",
      "contacts.manage",
      "seo.read",
      "seo.manage",
      "users.manage",
      "roles.manage"
    ]
  }
}
```

### POST /auth/forgot-password
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "email": "admin@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": null
}
```

### POST /auth/forgot-password
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "email": "nobody-real@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": null
}
```

### POST /auth/reset-password
**Status:** 400 — **PASS** (Expected 400)

**Request body:**
```json
{
  "token": "not-a-real-token",
  "password": "SomeNewPassword123"
}
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "This reset link is invalid or has expired."
  }
}
```

### POST /admin/publishers
**Status:** 201 — **PASS** (Expected 201)

**Request body:**
```json
{
  "slug": "test-publisher-2026-09-21T19-16-30-103Z",
  "name": "TEST_Publisher_2026-09-21T19-16-30-103Z",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "4619f4d9-c056-4a38-92f4-8b84d7cf9673",
    "slug": "test-publisher-2026-09-21T19-16-30-103Z",
    "name": "TEST_Publisher_2026-09-21T19-16-30-103Z",
    "description": null,
    "logo": null,
    "address": null,
    "country": null,
    "website": null,
    "email": null,
    "phone": null,
    "status": "active",
    "seoTitle": null,
    "seoDescription": null,
    "createdAt": "2026-09-21T19:16:39.339Z",
    "updatedAt": "2026-09-21T19:16:39.339Z"
  }
}
```

### GET /publishers
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "a1a87c37-c8dc-4f1f-82a3-6bf054dad24b",
      "slug": "sample-marine-science-press",
      "name": "Sample Marine Science Press",
      "description": null,
      "logo": null,
      "address": null,
      "country": null,
      "website": null,
      "email": null,
      "phone": null,
      "status": "active",
      "seoTitle": null,
      "seoDescription": null,
      "createdAt": "2026-09-05T10:38:03.729Z",
      "updatedAt": "2026-09-05T10:38:03.729Z"
    },
    {
      "id": "4619f4d9-c056-4a38-92f4-8b84d7cf9673",
      "slug": "test-publisher-2026-09-21T19-16-30-103Z",
      "name": "TEST_Publisher_2026-09-21T19-16-30-103Z",
      "description": null,
      "logo": null,
      "address": null,
      "country": null,
      "website": null,
      "email": null,
      "phone": null,
      "status": "active",
      "seoTitle": null,
      "seoDescription": null,
      "createdAt": "2026-09-21T19:16:39.339Z",
      "updatedAt": "2026-09-21T19:16:39.339Z"
    },
    {
      "id": "d9a829e1-3eab-4e80-83d6-87dea4356f9b",
      "slug": "test-publisher-2026-09-20T19-17-46-305Z",
      "name": "TEST_Publisher_Updated_2026-09-20T19-17-46-305Z",
      "description": null,
      "logo": null,
      "address": null,
      "country": null,
      "website": null,
      "email": null,
      "phone": null,
      "status": "active",
      "seoTitle": null,
      "seoDescription": null,
      "createdAt": "2026-09-20T19:17:56.395Z",
      "updatedAt": "2026-09-20T19:18:11.062Z"
    },
    {
      "id": "7f450c28-996b-44df-90b9-fbf57c01b828",
      "slug": "test-publisher-2026-09-21T05-34-59-088Z",
      "name": "TEST_Publisher_Updated_2026-09-21T05-34-59-088Z",
      "description": null,
      "logo": null,
      "address": null,
      "country": null,
      "website": null,
      "email": null,
      "phone": null,
      "status": "active",
      "seoTitle": null,
      "seoDescription": null,
      "createdAt": "2026-09-21T05:35:07.830Z",
      "updatedAt": "2026-09-21T05:35:13.648Z"
    }
  ]
}
```

### GET /publishers/test-publisher-2026-09-21T19-16-30-103Z
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "4619f4d9-c056-4a38-92f4-8b84d7cf9673",
    "slug": "test-publisher-2026-09-21T19-16-30-103Z",
    "name": "TEST_Publisher_2026-09-21T19-16-30-103Z",
    "description": null,
    "logo": null,
    "address": null,
    "country": null,
    "website": null,
    "email": null,
    "phone": null,
    "status": "active",
    "seoTitle": null,
    "seoDescription": null,
    "createdAt": "2026-09-21T19:16:39.339Z",
    "updatedAt": "2026-09-21T19:16:39.339Z"
  }
}
```

### GET /publishers/4619f4d9-c056-4a38-92f4-8b84d7cf9673/publications
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": []
}
```

### GET /admin/publishers/4619f4d9-c056-4a38-92f4-8b84d7cf9673
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "4619f4d9-c056-4a38-92f4-8b84d7cf9673",
    "slug": "test-publisher-2026-09-21T19-16-30-103Z",
    "name": "TEST_Publisher_2026-09-21T19-16-30-103Z",
    "description": null,
    "logo": null,
    "address": null,
    "country": null,
    "website": null,
    "email": null,
    "phone": null,
    "status": "active",
    "seoTitle": null,
    "seoDescription": null,
    "createdAt": "2026-09-21T19:16:39.339Z",
    "updatedAt": "2026-09-21T19:16:39.339Z"
  }
}
```

### GET /admin/publishers/not-a-real-id
**Status:** 404 — **PASS** (Expected 404)

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "PUBLISHER_NOT_FOUND",
    "message": "Not found: not-a-real-id"
  }
}
```

### PATCH /admin/publishers/4619f4d9-c056-4a38-92f4-8b84d7cf9673
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "name": "TEST_Publisher_Updated_2026-09-21T19-16-30-103Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "4619f4d9-c056-4a38-92f4-8b84d7cf9673",
    "slug": "test-publisher-2026-09-21T19-16-30-103Z",
    "name": "TEST_Publisher_Updated_2026-09-21T19-16-30-103Z",
    "description": null,
    "logo": null,
    "address": null,
    "country": null,
    "website": null,
    "email": null,
    "phone": null,
    "status": "active",
    "seoTitle": null,
    "seoDescription": null,
    "createdAt": "2026-09-21T19:16:39.339Z",
    "updatedAt": "2026-09-21T19:16:44.779Z"
  }
}
```

### POST /admin/publishers
**Status:** 401 — **PASS** (Expected 401)

**Request body:**
```json
{
  "slug": "x",
  "name": "x",
  "status": "active"
}
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required."
  }
}
```

### POST /admin/publications
**Status:** 201 — **PASS** (Expected 201)

**Request body:**
```json
{
  "slug": "test-journal-2026-09-21T19-16-30-103Z",
  "publisherId": "4619f4d9-c056-4a38-92f4-8b84d7cf9673",
  "name": "TEST_Journal_2026-09-21T19-16-30-103Z",
  "shortName": "TJ",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "slug": "test-journal-2026-09-21T19-16-30-103Z",
    "publisherId": "4619f4d9-c056-4a38-92f4-8b84d7cf9673",
    "name": "TEST_Journal_2026-09-21T19-16-30-103Z",
    "shortName": "TJ",
    "tagline": null,
    "issnOnline": null,
    "issnPrint": null,
    "founded": null,
    "frequency": null,
    "language": null,
    "country": null,
    "reviewModel": null,
    "accessModel": null,
    "subjectAreaIds": [],
    "email": null,
    "address": null,
    "website": null,
    "logo": null,
    "cover": null,
    "content": null,
    "status": "active",
    "seoTitle": null,
    "seoDescription": null,
    "createdAt": "2026-09-21T19:16:45.717Z",
    "updatedAt": "2026-09-21T19:16:45.717Z"
  }
}
```

### GET /publications
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "3d7adca4-e522-4903-b901-0d985765c316",
      "slug": "sample-journal-of-marine-ecology",
      "publisherId": "a1a87c37-c8dc-4f1f-82a3-6bf054dad24b",
      "name": "Sample Journal of Marine Ecology",
      "shortName": "SJME",
      "tagline": null,
      "issnOnline": null,
      "issnPrint": null,
      "founded": null,
      "frequency": null,
      "language": null,
      "country": null,
      "reviewModel": null,
      "accessModel": null,
      "subjectAreaIds": [],
      "email": null,
      "address": null,
      "website": null,
      "logo": null,
      "cover": null,
      "content": null,
      "status": "active",
      "seoTitle": null,
      "seoDescription": null,
      "createdAt": "2026-09-05T10:38:05.573Z",
      "updatedAt": "2026-09-05T10:38:05.573Z"
    },
    {
      "id": "ce91598c-8c56-4bfe-88a9-ab67225a46a2",
      "slug": "test-journal-2026-09-21T05-34-59-088Z",
      "publisherId": "7f450c28-996b-44df-90b9-fbf57c01b828",
      "name": "TEST_Journal_2026-09-21T05-34-59-088Z",
      "shortName": "TJ",
      "tagline": "Updated via test script",
      "issnOnline": null,
      "issnPrint": null,
      "founded": null,
      "frequency": null,
      "language": null,
      "country": null,
      "reviewModel": null,
      "accessModel": null,
      "subjectAreaIds": [],
      "email": null,
      "address": null,
      "website": null,
      "logo": null,
      "cover": null,
      "content": null,
      "status": "archived",
      "seoTitle": null,
      "seoDescription": null,
      "createdAt": "2026-09-21T05:35:14.627Z",
      "updatedAt": "2026-09-21T05:35:19.818Z"
    },
    {
      "id": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
      "slug": "test-journal-2026-09-21T19-16-30-103Z",
      "publisherId": "4619f4d9-c056-4a38-92f4-8b84d7cf9673",
      "name": "TEST_Journal_2026-09-21T19-16-30-103Z",
      "shortName": "TJ",
      "tagline": null,
      "issnOnline": null,
      "issnPrint": null,
      "founded": null,
      "frequency": null,
      "language": null,
      "country": null,
      "reviewModel": null,
      "accessModel": null,
      "subjectAreaIds": [],
      "email": null,
      "address": null,
      "website": null,
      "logo": null,
      "cover": null,
      "content": null,
      "status": "active",
      "seoTitle": null,
      "seoDescription": null,
      "createdAt": "2026-09-21T19:16:45.717Z",
      "updatedAt": "2026-09-21T19:16:45.717Z"
    }
  ]
}
```

### GET /publications/test-journal-2026-09-21T19-16-30-103Z
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "slug": "test-journal-2026-09-21T19-16-30-103Z",
    "publisherId": "4619f4d9-c056-4a38-92f4-8b84d7cf9673",
    "name": "TEST_Journal_2026-09-21T19-16-30-103Z",
    "shortName": "TJ",
    "tagline": null,
    "issnOnline": null,
    "issnPrint": null,
    "founded": null,
    "frequency": null,
    "language": null,
    "country": null,
    "reviewModel": null,
    "accessModel": null,
    "subjectAreaIds": [],
    "email": null,
    "address": null,
    "website": null,
    "logo": null,
    "cover": null,
    "content": null,
    "status": "active",
    "seoTitle": null,
    "seoDescription": null,
    "createdAt": "2026-09-21T19:16:45.717Z",
    "updatedAt": "2026-09-21T19:16:45.717Z"
  }
}
```

### GET /admin/publications/1d4582d6-d50b-42f9-a4d7-ba0a12d7b248
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "slug": "test-journal-2026-09-21T19-16-30-103Z",
    "publisherId": "4619f4d9-c056-4a38-92f4-8b84d7cf9673",
    "name": "TEST_Journal_2026-09-21T19-16-30-103Z",
    "shortName": "TJ",
    "tagline": null,
    "issnOnline": null,
    "issnPrint": null,
    "founded": null,
    "frequency": null,
    "language": null,
    "country": null,
    "reviewModel": null,
    "accessModel": null,
    "subjectAreaIds": [],
    "email": null,
    "address": null,
    "website": null,
    "logo": null,
    "cover": null,
    "content": null,
    "status": "active",
    "seoTitle": null,
    "seoDescription": null,
    "createdAt": "2026-09-21T19:16:45.717Z",
    "updatedAt": "2026-09-21T19:16:45.717Z"
  }
}
```

### PATCH /admin/publications/1d4582d6-d50b-42f9-a4d7-ba0a12d7b248
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "tagline": "Updated via test script"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "slug": "test-journal-2026-09-21T19-16-30-103Z",
    "publisherId": "4619f4d9-c056-4a38-92f4-8b84d7cf9673",
    "name": "TEST_Journal_2026-09-21T19-16-30-103Z",
    "shortName": "TJ",
    "tagline": "Updated via test script",
    "issnOnline": null,
    "issnPrint": null,
    "founded": null,
    "frequency": null,
    "language": null,
    "country": null,
    "reviewModel": null,
    "accessModel": null,
    "subjectAreaIds": [],
    "email": null,
    "address": null,
    "website": null,
    "logo": null,
    "cover": null,
    "content": null,
    "status": "active",
    "seoTitle": null,
    "seoDescription": null,
    "createdAt": "2026-09-21T19:16:45.717Z",
    "updatedAt": "2026-09-21T19:16:49.829Z"
  }
}
```

### PATCH /admin/publications/1d4582d6-d50b-42f9-a4d7-ba0a12d7b248
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "status": "archived"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "slug": "test-journal-2026-09-21T19-16-30-103Z",
    "publisherId": "4619f4d9-c056-4a38-92f4-8b84d7cf9673",
    "name": "TEST_Journal_2026-09-21T19-16-30-103Z",
    "shortName": "TJ",
    "tagline": "Updated via test script",
    "issnOnline": null,
    "issnPrint": null,
    "founded": null,
    "frequency": null,
    "language": null,
    "country": null,
    "reviewModel": null,
    "accessModel": null,
    "subjectAreaIds": [],
    "email": null,
    "address": null,
    "website": null,
    "logo": null,
    "cover": null,
    "content": null,
    "status": "archived",
    "seoTitle": null,
    "seoDescription": null,
    "createdAt": "2026-09-21T19:16:45.717Z",
    "updatedAt": "2026-09-21T19:16:50.898Z"
  }
}
```

### POST /admin/publications
**Status:** 400 — **PASS** (Expected 400)

**Request body:**
```json
{
  "slug": "bad"
}
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "publisherId: Required; name: Required; shortName: Required; status: Required"
  }
}
```

### POST /admin/volumes
**Status:** 201 — **PASS** (Expected 201)

**Request body:**
```json
{
  "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
  "number": 1,
  "year": 2026,
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "15649a95-7545-430a-9cbe-8dbcc36358a7",
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "number": 1,
    "year": 2026,
    "description": null,
    "status": "active",
    "createdAt": "2026-09-21T19:16:52.353Z",
    "updatedAt": "2026-09-21T19:16:52.353Z"
  }
}
```

### GET /admin/volumes
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "15649a95-7545-430a-9cbe-8dbcc36358a7",
      "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
      "number": 1,
      "year": 2026,
      "description": null,
      "status": "active",
      "createdAt": "2026-09-21T19:16:52.353Z",
      "updatedAt": "2026-09-21T19:16:52.353Z"
    },
    {
      "id": "aca4a6df-3955-45e3-b6a1-b90d5ceddd08",
      "publicationId": "3d7adca4-e522-4903-b901-0d985765c316",
      "number": 1,
      "year": 2026,
      "description": null,
      "status": "active",
      "createdAt": "2026-09-05T10:38:07.833Z",
      "updatedAt": "2026-09-05T10:38:07.833Z"
    },
    {
      "id": "eefb9a93-ee96-4e05-81a8-b622fef94fb5",
      "publicationId": "ce91598c-8c56-4bfe-88a9-ab67225a46a2",
      "number": 1,
      "year": 2027,
      "description": null,
      "status": "active",
      "createdAt": "2026-09-21T05:35:21.489Z",
      "updatedAt": "2026-09-21T05:35:26.042Z"
    }
  ]
}
```

### GET /publications/1d4582d6-d50b-42f9-a4d7-ba0a12d7b248/volumes
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "15649a95-7545-430a-9cbe-8dbcc36358a7",
      "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
      "number": 1,
      "year": 2026,
      "description": null,
      "status": "active",
      "createdAt": "2026-09-21T19:16:52.353Z",
      "updatedAt": "2026-09-21T19:16:52.353Z"
    }
  ]
}
```

### GET /volumes/15649a95-7545-430a-9cbe-8dbcc36358a7
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "15649a95-7545-430a-9cbe-8dbcc36358a7",
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "number": 1,
    "year": 2026,
    "description": null,
    "status": "active",
    "createdAt": "2026-09-21T19:16:52.353Z",
    "updatedAt": "2026-09-21T19:16:52.353Z"
  }
}
```

### GET /volumes/not-a-real-id
**Status:** 404 — **PASS** (Expected 404)

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "VOLUME_NOT_FOUND",
    "message": "Not found: not-a-real-id"
  }
}
```

### PATCH /admin/volumes/15649a95-7545-430a-9cbe-8dbcc36358a7
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "year": 2027
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "15649a95-7545-430a-9cbe-8dbcc36358a7",
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "number": 1,
    "year": 2027,
    "description": null,
    "status": "active",
    "createdAt": "2026-09-21T19:16:52.353Z",
    "updatedAt": "2026-09-21T19:16:56.973Z"
  }
}
```

### POST /admin/issues
**Status:** 201 — **PASS** (Expected 201)

**Request body:**
```json
{
  "volumeId": "15649a95-7545-430a-9cbe-8dbcc36358a7",
  "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
  "number": 1,
  "label": "Issue 1",
  "status": "current"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "889d9efc-c74b-434e-b55e-ff0e733e64b5",
    "volumeId": "15649a95-7545-430a-9cbe-8dbcc36358a7",
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "number": 1,
    "label": "Issue 1",
    "period": null,
    "publicationDate": null,
    "description": null,
    "cover": null,
    "status": "current",
    "createdAt": "2026-09-21T19:16:58.628Z",
    "updatedAt": "2026-09-21T19:16:58.628Z"
  }
}
```

### GET /admin/issues
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "889d9efc-c74b-434e-b55e-ff0e733e64b5",
      "volumeId": "15649a95-7545-430a-9cbe-8dbcc36358a7",
      "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
      "number": 1,
      "label": "Issue 1",
      "period": null,
      "publicationDate": null,
      "description": null,
      "cover": null,
      "status": "current",
      "createdAt": "2026-09-21T19:16:58.628Z",
      "updatedAt": "2026-09-21T19:16:58.628Z",
      "volume": {
        "number": 1
      }
    },
    {
      "id": "16cd5350-6952-4fdd-89a6-787639411524",
      "volumeId": "aca4a6df-3955-45e3-b6a1-b90d5ceddd08",
      "publicationId": "3d7adca4-e522-4903-b901-0d985765c316",
      "number": 1,
      "label": "Issue 1",
      "period": null,
      "publicationDate": null,
      "description": null,
      "cover": null,
      "status": "published",
      "createdAt": "2026-09-05T10:38:10.486Z",
      "updatedAt": "2026-09-05T10:38:10.486Z",
      "volume": {
        "number": 1
      }
    },
    {
      "id": "7a21fa38-2ea7-44ce-8c1f-41debe391eab",
      "volumeId": "eefb9a93-ee96-4e05-81a8-b622fef94fb5",
      "publicationId": "ce91598c-8c56-4bfe-88a9-ab67225a46a2",
      "number": 1,
      "label": "Issue 1 (Updated)",
      "period": null,
      "publicationDate": null,
      "description": null,
      "cover": null,
      "status": "current",
      "createdAt": "2026-09-21T05:35:27.438Z",
      "updatedAt": "2026-09-21T05:35:35.630Z",
      "volume": {
        "number": 1
      }
    }
  ]
}
```

### GET /volumes/15649a95-7545-430a-9cbe-8dbcc36358a7/issues
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "889d9efc-c74b-434e-b55e-ff0e733e64b5",
      "volumeId": "15649a95-7545-430a-9cbe-8dbcc36358a7",
      "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
      "number": 1,
      "label": "Issue 1",
      "period": null,
      "publicationDate": null,
      "description": null,
      "cover": null,
      "status": "current",
      "createdAt": "2026-09-21T19:16:58.628Z",
      "updatedAt": "2026-09-21T19:16:58.628Z",
      "volume": {
        "number": 1
      }
    }
  ]
}
```

### GET /publications/1d4582d6-d50b-42f9-a4d7-ba0a12d7b248/issues
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "889d9efc-c74b-434e-b55e-ff0e733e64b5",
      "volumeId": "15649a95-7545-430a-9cbe-8dbcc36358a7",
      "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
      "number": 1,
      "label": "Issue 1",
      "period": null,
      "publicationDate": null,
      "description": null,
      "cover": null,
      "status": "current",
      "createdAt": "2026-09-21T19:16:58.628Z",
      "updatedAt": "2026-09-21T19:16:58.628Z",
      "volume": {
        "number": 1
      }
    }
  ]
}
```

### GET /publications/1d4582d6-d50b-42f9-a4d7-ba0a12d7b248/current-issue
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "889d9efc-c74b-434e-b55e-ff0e733e64b5",
    "volumeId": "15649a95-7545-430a-9cbe-8dbcc36358a7",
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "number": 1,
    "label": "Issue 1",
    "period": null,
    "publicationDate": null,
    "description": null,
    "cover": null,
    "status": "current",
    "createdAt": "2026-09-21T19:16:58.628Z",
    "updatedAt": "2026-09-21T19:16:58.628Z"
  }
}
```

### GET /issues/889d9efc-c74b-434e-b55e-ff0e733e64b5
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "889d9efc-c74b-434e-b55e-ff0e733e64b5",
    "volumeId": "15649a95-7545-430a-9cbe-8dbcc36358a7",
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "number": 1,
    "label": "Issue 1",
    "period": null,
    "publicationDate": null,
    "description": null,
    "cover": null,
    "status": "current",
    "createdAt": "2026-09-21T19:16:58.628Z",
    "updatedAt": "2026-09-21T19:16:58.628Z"
  }
}
```

### PATCH /admin/issues/889d9efc-c74b-434e-b55e-ff0e733e64b5
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "label": "Issue 1 (Updated)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "889d9efc-c74b-434e-b55e-ff0e733e64b5",
    "volumeId": "15649a95-7545-430a-9cbe-8dbcc36358a7",
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "number": 1,
    "label": "Issue 1 (Updated)",
    "period": null,
    "publicationDate": null,
    "description": null,
    "cover": null,
    "status": "current",
    "createdAt": "2026-09-21T19:16:58.628Z",
    "updatedAt": "2026-09-21T19:17:06.030Z"
  }
}
```

### POST /admin/authors
**Status:** 201 — **PASS** (Expected 201)

**Request body:**
```json
{
  "slug": "test-author-2026-09-21T19-16-30-103Z",
  "firstName": "Test",
  "lastName": "Author_2026-09-21T19-16-30-103Z",
  "fullName": "Test Author_2026-09-21T19-16-30-103Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "a0cd60b8-59bb-4d07-aa36-90abd70c69b2",
    "slug": "test-author-2026-09-21T19-16-30-103Z",
    "firstName": "Test",
    "lastName": "Author_2026-09-21T19-16-30-103Z",
    "fullName": "Test Author_2026-09-21T19-16-30-103Z",
    "institution": null,
    "department": null,
    "country": null,
    "bio": null,
    "orcid": null,
    "profileImage": null,
    "website": null,
    "email": null,
    "createdAt": "2026-09-21T19:17:07.125Z",
    "updatedAt": "2026-09-21T19:17:07.125Z"
  }
}
```

### GET /authors
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "6959b587-1fe5-4c59-af4f-f46c76fc599a",
      "slug": "test-author-2026-09-20T19-17-46-305Z",
      "firstName": "Test",
      "lastName": "Author_2026-09-20T19-17-46-305Z",
      "fullName": "Test Author_2026-09-20T19-17-46-305Z",
      "institution": null,
      "department": null,
      "country": null,
      "bio": "Updated via test script",
      "orcid": null,
      "profileImage": null,
      "website": null,
      "createdAt": "2026-09-20T19:18:32.465Z",
      "updatedAt": "2026-09-20T19:18:38.662Z"
    },
    {
      "id": "8db41882-5109-4a12-acb1-989150f188b2",
      "slug": "test-author-2026-09-21T05-34-59-088Z",
      "firstName": "Test",
      "lastName": "Author_2026-09-21T05-34-59-088Z",
      "fullName": "Test Author_2026-09-21T05-34-59-088Z",
      "institution": null,
      "department": null,
      "country": null,
      "bio": "Updated via test script",
      "orcid": null,
      "profileImage": null,
      "website": null,
      "createdAt": "2026-09-21T05:35:36.995Z",
      "updatedAt": "2026-09-21T05:35:42.047Z"
    },
    {
      "id": "a0cd60b8-59bb-4d07-aa36-90abd70c69b2",
      "slug": "test-author-2026-09-21T19-16-30-103Z",
      "firstName": "Test",
      "lastName": "Author_2026-09-21T19-16-30-103Z",
      "fullName": "Test Author_2026-09-21T19-16-30-103Z",
      "institution": null,
      "department": null,
      "country": null,
      "bio": null,
      "orcid": null,
      "profileImage": null,
      "website": null,
      "createdAt": "2026-09-21T19:17:07.125Z",
      "updatedAt": "2026-09-21T19:17:07.125Z"
    },
    {
      "id": "35218f79-97bc-4493-8fb4-c2122b536234",
      "slug": "sample-author-j-reyes",
      "firstName": "J.",
      "lastName": "Reyes",
      "fullName": "J. Reyes",
      "institution": "Sample Institute of Marine Studies",
      "department": null,
      "country": null,
      "bio": null,
      "orcid": null,
      "profileImage": null,
      "website": null,
      "createdAt": "2026-09-05T10:38:11.008Z",
      "updatedAt": "2026-09-05T10:38:11.008Z"
    },
    {
      "id": "f0e9e776-08ab-453e-a578-aa97a9a71f7b",
      "slug": "test-submitter-97074c",
      "firstName": "Test",
      "lastName": "Submitter",
      "fullName": "Test Submitter",
      "institution": null,
      "department": null,
      "country": null,
      "bio": null,
      "orcid": null,
      "profileImage": null,
      "website": null,
      "createdAt": "2026-09-21T05:36:44.015Z",
      "updatedAt": "2026-09-21T05:36:44.015Z"
    }
  ]
}
```

### GET /authors/test-author-2026-09-21T19-16-30-103Z
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "a0cd60b8-59bb-4d07-aa36-90abd70c69b2",
    "slug": "test-author-2026-09-21T19-16-30-103Z",
    "firstName": "Test",
    "lastName": "Author_2026-09-21T19-16-30-103Z",
    "fullName": "Test Author_2026-09-21T19-16-30-103Z",
    "institution": null,
    "department": null,
    "country": null,
    "bio": null,
    "orcid": null,
    "profileImage": null,
    "website": null,
    "createdAt": "2026-09-21T19:17:07.125Z",
    "updatedAt": "2026-09-21T19:17:07.125Z"
  }
}
```

### GET /authors/a0cd60b8-59bb-4d07-aa36-90abd70c69b2/articles
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": []
}
```

### GET /admin/authors/a0cd60b8-59bb-4d07-aa36-90abd70c69b2
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "a0cd60b8-59bb-4d07-aa36-90abd70c69b2",
    "slug": "test-author-2026-09-21T19-16-30-103Z",
    "firstName": "Test",
    "lastName": "Author_2026-09-21T19-16-30-103Z",
    "fullName": "Test Author_2026-09-21T19-16-30-103Z",
    "institution": null,
    "department": null,
    "country": null,
    "bio": null,
    "orcid": null,
    "profileImage": null,
    "website": null,
    "email": null,
    "createdAt": "2026-09-21T19:17:07.125Z",
    "updatedAt": "2026-09-21T19:17:07.125Z"
  }
}
```

### PATCH /admin/authors/a0cd60b8-59bb-4d07-aa36-90abd70c69b2
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "bio": "Updated via test script"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "a0cd60b8-59bb-4d07-aa36-90abd70c69b2",
    "slug": "test-author-2026-09-21T19-16-30-103Z",
    "firstName": "Test",
    "lastName": "Author_2026-09-21T19-16-30-103Z",
    "fullName": "Test Author_2026-09-21T19-16-30-103Z",
    "institution": null,
    "department": null,
    "country": null,
    "bio": "Updated via test script",
    "orcid": null,
    "profileImage": null,
    "website": null,
    "email": null,
    "createdAt": "2026-09-21T19:17:07.125Z",
    "updatedAt": "2026-09-21T19:17:12.271Z"
  }
}
```

### POST /admin/editors
**Status:** 201 — **PASS** (Expected 201)

**Request body:**
```json
{
  "slug": "test-editor-2026-09-21T19-16-30-103Z",
  "name": "Test Editor_2026-09-21T19-16-30-103Z",
  "role": "managing_editor",
  "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "26d8f6f0-5a2f-464e-95a8-0519c31a5d59",
    "slug": "test-editor-2026-09-21T19-16-30-103Z",
    "name": "Test Editor_2026-09-21T19-16-30-103Z",
    "role": "managing_editor",
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "institution": null,
    "country": null,
    "bio": null,
    "profileImage": null,
    "orcid": null,
    "researchInterests": [],
    "displayOrder": 0,
    "status": "active",
    "createdAt": "2026-09-21T19:17:13.177Z",
    "updatedAt": "2026-09-21T19:17:13.177Z"
  }
}
```

### GET /admin/editors
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "26d8f6f0-5a2f-464e-95a8-0519c31a5d59",
      "slug": "test-editor-2026-09-21T19-16-30-103Z",
      "name": "Test Editor_2026-09-21T19-16-30-103Z",
      "role": "managing_editor",
      "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
      "institution": null,
      "country": null,
      "bio": null,
      "profileImage": null,
      "orcid": null,
      "researchInterests": [],
      "displayOrder": 0,
      "status": "active",
      "createdAt": "2026-09-21T19:17:13.177Z",
      "updatedAt": "2026-09-21T19:17:13.177Z"
    },
    {
      "id": "e1c76990-8cfe-4306-9be6-0c17e37a8a52",
      "slug": "david-odianonsen-omijeh",
      "name": "David odianonsen Omijeh",
      "role": "board_member",
      "publicationId": "3d7adca4-e522-4903-b901-0d985765c316",
      "institution": "University of Portharcourt",
      "country": "Nigeria",
      "bio": "`test",
      "profileImage": "https://pub-9887a4bdd7a84a55ba94399620a2d637.r2.dev/editors/cc39b5c9-91ff-472b-b390-880a31e7bfab.jpg",
      "orcid": "test",
      "researchInterests": [
        "test"
      ],
      "displayOrder": 99,
      "status": "active",
      "createdAt": "2026-09-06T02:11:21.577Z",
      "updatedAt": "2026-09-06T02:11:21.577Z"
    },
    {
      "id": "ec586ebe-9914-46d0-8bf1-5ae9a19b8b71",
      "slug": "test-editor-2026-09-21T05-34-59-088Z",
      "name": "Test Editor_2026-09-21T05-34-59-088Z",
      "role": "managing_editor",
      "publicationId": "ce91598c-8c56-4bfe-88a9-ab67225a46a2",
      "institution": null,
      "country": null,
      "bio": "Updated via test script",
      "profileImage": null,
      "orcid": null,
      "researchInterests": [],
      "displayOrder": 0,
      "status": "active",
      "createdAt": "2026-09-21T05:35:42.949Z",
      "updatedAt": "2026-09-21T05:35:47.513Z"
    }
  ]
}
```

### GET /publications/1d4582d6-d50b-42f9-a4d7-ba0a12d7b248/editorial-board
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "26d8f6f0-5a2f-464e-95a8-0519c31a5d59",
      "slug": "test-editor-2026-09-21T19-16-30-103Z",
      "name": "Test Editor_2026-09-21T19-16-30-103Z",
      "role": "managing_editor",
      "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
      "institution": null,
      "country": null,
      "bio": null,
      "profileImage": null,
      "orcid": null,
      "researchInterests": [],
      "displayOrder": 0,
      "status": "active",
      "createdAt": "2026-09-21T19:17:13.177Z",
      "updatedAt": "2026-09-21T19:17:13.177Z"
    }
  ]
}
```

### GET /editors/test-editor-2026-09-21T19-16-30-103Z
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "26d8f6f0-5a2f-464e-95a8-0519c31a5d59",
    "slug": "test-editor-2026-09-21T19-16-30-103Z",
    "name": "Test Editor_2026-09-21T19-16-30-103Z",
    "role": "managing_editor",
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "institution": null,
    "country": null,
    "bio": null,
    "profileImage": null,
    "orcid": null,
    "researchInterests": [],
    "displayOrder": 0,
    "status": "active",
    "createdAt": "2026-09-21T19:17:13.177Z",
    "updatedAt": "2026-09-21T19:17:13.177Z"
  }
}
```

### GET /admin/editors/26d8f6f0-5a2f-464e-95a8-0519c31a5d59
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "26d8f6f0-5a2f-464e-95a8-0519c31a5d59",
    "slug": "test-editor-2026-09-21T19-16-30-103Z",
    "name": "Test Editor_2026-09-21T19-16-30-103Z",
    "role": "managing_editor",
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "institution": null,
    "country": null,
    "bio": null,
    "profileImage": null,
    "orcid": null,
    "researchInterests": [],
    "displayOrder": 0,
    "status": "active",
    "createdAt": "2026-09-21T19:17:13.177Z",
    "updatedAt": "2026-09-21T19:17:13.177Z"
  }
}
```

### PATCH /admin/editors/26d8f6f0-5a2f-464e-95a8-0519c31a5d59
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "bio": "Updated via test script"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "26d8f6f0-5a2f-464e-95a8-0519c31a5d59",
    "slug": "test-editor-2026-09-21T19-16-30-103Z",
    "name": "Test Editor_2026-09-21T19-16-30-103Z",
    "role": "managing_editor",
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "institution": null,
    "country": null,
    "bio": "Updated via test script",
    "profileImage": null,
    "orcid": null,
    "researchInterests": [],
    "displayOrder": 0,
    "status": "active",
    "createdAt": "2026-09-21T19:17:13.177Z",
    "updatedAt": "2026-09-21T19:17:17.963Z"
  }
}
```

### POST /admin/reviewers
**Status:** 201 — **PASS** (Expected 201)

**Request body:**
```json
{
  "name": "Test Reviewer_2026-09-21T19-16-30-103Z",
  "email": "test-reviewer-2026-09-21T19-16-30-103Z@example.com",
  "status": "active",
  "expertise": [
    "Testing"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "0a6bad8b-e1f1-4bf4-9a7e-653bf70b926e",
    "name": "Test Reviewer_2026-09-21T19-16-30-103Z",
    "email": "test-reviewer-2026-09-21T19-16-30-103Z@example.com",
    "institution": null,
    "country": null,
    "expertise": [
      "Testing"
    ],
    "status": "active",
    "createdAt": "2026-09-21T19:17:18.885Z",
    "updatedAt": "2026-09-21T19:17:18.885Z"
  }
}
```

### GET /admin/reviewers
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "98e69b40-1499-4ff1-90ce-1f55d87e938a",
      "name": "Test Reviewer_2026-09-20T19-17-46-305Z",
      "email": "test-reviewer-2026-09-20T19-17-46-305Z@example.com",
      "institution": null,
      "country": "Testland",
      "expertise": [
        "Testing"
      ],
      "status": "active",
      "createdAt": "2026-09-20T19:18:46.153Z",
      "updatedAt": "2026-09-20T19:18:49.976Z",
      "assignedReviewCount": 0
    },
    {
      "id": "59e81c88-3fc5-46f0-bdb1-c38ab6d830c2",
      "name": "Test Reviewer_2026-09-21T05-34-59-088Z",
      "email": "test-reviewer-2026-09-21T05-34-59-088Z@example.com",
      "institution": null,
      "country": "Testland",
      "expertise": [
        "Testing"
      ],
      "status": "active",
      "createdAt": "2026-09-21T05:35:48.600Z",
      "updatedAt": "2026-09-21T05:35:58.261Z",
      "assignedReviewCount": 0
    },
    {
      "id": "0a6bad8b-e1f1-4bf4-9a7e-653bf70b926e",
      "name": "Test Reviewer_2026-09-21T19-16-30-103Z",
      "email": "test-reviewer-2026-09-21T19-16-30-103Z@example.com",
      "institution": null,
      "country": null,
      "expertise": [
        "Testing"
      ],
      "status": "active",
      "createdAt": "2026-09-21T19:17:18.885Z",
      "updatedAt": "2026-09-21T19:17:18.885Z",
      "assignedReviewCount": 0
    }
  ]
}
```

### GET /admin/reviewers/0a6bad8b-e1f1-4bf4-9a7e-653bf70b926e
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "0a6bad8b-e1f1-4bf4-9a7e-653bf70b926e",
    "name": "Test Reviewer_2026-09-21T19-16-30-103Z",
    "email": "test-reviewer-2026-09-21T19-16-30-103Z@example.com",
    "institution": null,
    "country": null,
    "expertise": [
      "Testing"
    ],
    "status": "active",
    "createdAt": "2026-09-21T19:17:18.885Z",
    "updatedAt": "2026-09-21T19:17:18.885Z"
  }
}
```

### PATCH /admin/reviewers/0a6bad8b-e1f1-4bf4-9a7e-653bf70b926e
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "country": "Testland"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "0a6bad8b-e1f1-4bf4-9a7e-653bf70b926e",
    "name": "Test Reviewer_2026-09-21T19-16-30-103Z",
    "email": "test-reviewer-2026-09-21T19-16-30-103Z@example.com",
    "institution": null,
    "country": "Testland",
    "expertise": [
      "Testing"
    ],
    "status": "active",
    "createdAt": "2026-09-21T19:17:18.885Z",
    "updatedAt": "2026-09-21T19:17:21.956Z"
  }
}
```

### POST /admin/articles
**Status:** 201 — **PASS** (Expected 201)

**Request body:**
```json
{
  "slug": "test-article-2026-09-21T19-16-30-103Z",
  "title": "TEST_Article_2026-09-21T19-16-30-103Z",
  "abstract": "A test abstract created by test-all-endpoints.mjs.",
  "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
  "articleType": "Research Article",
  "status": "draft",
  "authorIds": [
    "a0cd60b8-59bb-4d07-aa36-90abd70c69b2"
  ],
  "editorIds": [
    "26d8f6f0-5a2f-464e-95a8-0519c31a5d59"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
    "slug": "test-article-2026-09-21T19-16-30-103Z",
    "title": "TEST_Article_2026-09-21T19-16-30-103Z",
    "abstract": "A test abstract created by test-all-endpoints.mjs.",
    "content": null,
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "volumeId": null,
    "issueId": null,
    "pages": null,
    "doi": null,
    "manuscriptId": null,
    "articleType": "Research Article",
    "receivedDate": null,
    "revisedDate": null,
    "acceptedDate": null,
    "publishedDate": null,
    "pdfUrl": null,
    "supplementaryFiles": [],
    "references": [],
    "keywords": [],
    "license": null,
    "status": "draft",
    "area": null,
    "seoTitle": null,
    "seoDescription": null,
    "seoCanonicalUrl": null,
    "createdAt": "2026-09-21T19:17:23.076Z",
    "updatedAt": "2026-09-21T19:17:23.076Z",
    "authorIds": [
      "a0cd60b8-59bb-4d07-aa36-90abd70c69b2"
    ],
    "editorIds": [
      "26d8f6f0-5a2f-464e-95a8-0519c31a5d59"
    ]
  }
}
```

### GET /admin/articles
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
      "slug": "test-article-2026-09-21T19-16-30-103Z",
      "title": "TEST_Article_2026-09-21T19-16-30-103Z",
      "abstract": "A test abstract created by test-all-endpoints.mjs.",
      "content": null,
      "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
      "volumeId": null,
      "issueId": null,
      "pages": null,
      "doi": null,
      "manuscriptId": null,
      "articleType": "Research Article",
      "receivedDate": null,
      "revisedDate": null,
      "acceptedDate": null,
      "publishedDate": null,
      "pdfUrl": null,
      "supplementaryFiles": [],
      "references": [],
      "keywords": [],
      "license": null,
      "status": "draft",
      "area": null,
      "seoTitle": null,
      "seoDescription": null,
      "seoCanonicalUrl": null,
      "createdAt": "2026-09-21T19:17:23.076Z",
      "updatedAt": "2026-09-21T19:17:23.076Z",
      "editors": [
        {
          "id": "26d8f6f0-5a2f-464e-95a8-0519c31a5d59",
          "slug": "test-editor-2026-09-21T19-16-30-103Z",
          "name": "Test Editor_2026-09-21T19-16-30-103Z",
          "role": "managing_editor",
          "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
          "institution": null,
          "country": null,
          "bio": "Updated via test script",
          "profileImage": null,
          "orcid": null,
          "researchInterests": [],
          "displayOrder": 0,
          "status": "active",
          "createdAt": "2026-09-21T19:17:13.177Z",
          "updatedAt": "2026-09-21T19:17:17.963Z"
        }
      ],
      "authors": [
        {
          "id": "a0cd60b8-59bb-4d07-aa36-90abd70c69b2",
          "slug": "test-author-2026-09-21T19-16-30-103Z",
          "firstName": "Test",
          "lastName": "Author_2026-09-21T19-16-30-103Z",
          "fullName": "Test Author_2026-09-21T19-16-30-103Z",
          "institution": null,
          "department": null,
          "country": null,
          "bio": "Updated via test script",
          "orcid": null,
          "profileImage": null,
          "website": null,
          "email": null,
          "createdAt": "2026-09-21T19:17:07.125Z",
          "updatedAt": "2026-09-21T19:17:12.271Z"
        }
      ],
      "volumeNumber": null,
      "issueNumber": null
    },
    {
      "id": "79c8c971-acfb-40f4-8f89-591043780168",
      "slug": "sample-coral-bleaching-thermal-stress-recovery",
      "title": "Thermal Stress, Bleaching, and Recovery Dynamics in Coral Reef Ecosystems",
      "abstract": "This article reviews the mechanisms of coral bleaching under thermal stress, patterns of species-level recovery, and the evidence for local management interventions improving reef resilience in the face of repeated bleaching events.",
      "content": "Coral reefs occupy less than one percent of the ocean floor, yet they support an estimated quarter of all marine species at some stage of their life cycle. This disproportionate concentration of biodiversity makes reefs one of the most closely watched indicators of ocean health, and one of the most vulnerable to a warming climate.\n\nThermal stress is the primary driver of coral bleaching. When sea surface temperatures rise even one to two degrees Celsius above the local summer maximum for several consecutive weeks, the symbiotic algae living within coral tissue — zooxanthellae — are expelled. Since these algae supply the coral host with the majority of its energy through photosynthesis, their loss leaves the coral visibly white and metabolically starved. A bleached coral is not dead, but it is under severe stress, and prolonged bleaching events sharply increase mortality.\n\nRecovery patterns vary considerably by species and by the frequency of bleaching events. Fast-growing branching corals such as Acropora tend to bleach earlier and more severely than massive, slow-growing corals such as Porites, but branching species can also recolonize damaged reef area more quickly if conditions stabilize. Repeated bleaching events with insufficient recovery time between them, however, produce a cumulative decline that favors weedy, opportunistic species over the structurally complex corals that provide habitat for fish and invertebrates.\n\nLocal management interventions cannot lower global sea temperatures, but the evidence increasingly suggests they can meaningfully affect a reef's resilience. Reducing nutrient runoff and sedimentation, limiting anchor damage and destructive fishing practices, and maintaining herbivorous fish populations that keep algal overgrowth in check all appear to improve a reef's odds of recovering between thermal stress events. Marine protected areas with strong enforcement consistently show higher coral cover and faster recovery than comparable unprotected sites nearby.\n\nRestoration efforts, including coral gardening and assisted gene flow between heat-tolerant populations, have expanded substantially over the past decade. Early results are promising at small scales, but the areas restored remain a tiny fraction of degraded reef globally, and long-term survival data for outplanted colonies under real bleaching conditions is still limited. Most researchers in the field describe restoration as a valuable complement to emissions reduction and local protection, not a substitute for either.\n\nMonitoring methodology has also shifted over the past fifteen years. Manual line-intercept transect surveys, long the standard for estimating live coral cover, are increasingly supplemented or replaced by structure-from-motion photogrammetry, in which divers capture overlapping photographs that are later stitched into a three-dimensional reef model. This approach preserves far more structural detail than a transect line alone, allowing researchers to track changes in reef rugosity and colony-level growth or mortality across repeated surveys of the same plot, rather than relying solely on percent-cover estimates that can mask which specific colonies are declining.\n\nSatellite-derived sea surface temperature products, particularly NOAA's Coral Reef Watch program, now provide near-real-time bleaching alert levels for reef regions worldwide, based on accumulated thermal stress relative to a location's historical maximum monthly mean. These products have become a standard reference point in the bleaching literature, allowing researchers to compare bleaching severity across widely separated reef systems using a consistent thermal-stress metric rather than raw temperature alone, which does not account for a given reef's typical seasonal range or its corals' acclimatization to it.\n\nGenetic and physiological research into coral thermal tolerance has identified substantial variation both between and within species, some of it linked to the specific clade of zooxanthellae a colony hosts. Colonies harboring more heat-tolerant algal symbionts, such as certain members of the genus Durusdinium, often bleach less severely under equivalent thermal stress than colonies of the same coral species hosting more sensitive symbiont types, though this tolerance can come with a measurable cost to the coral's growth rate under normal, non-stressed conditions. This tradeoff has become a central consideration in assisted evolution proposals, since selecting purely for heat tolerance risks producing reefs that recover from bleaching but grow too slowly to keep pace with other forms of reef degradation.",
      "publicationId": "3d7adca4-e522-4903-b901-0d985765c316",
      "volumeId": "aca4a6df-3955-45e3-b6a1-b90d5ceddd08",
      "issueId": "16cd5350-6952-4fdd-89a6-787639411524",
      "pages": null,
      "doi": "10.9999/sjme.2026.0001",
      "manuscriptId": null,
      "articleType": "research",
      "receivedDate": null,
      "revisedDate": null,
      "acceptedDate": null,
      "publishedDate": "2026-01-15T00:00:00.000Z",
      "pdfUrl": null,
      "supplementaryFiles": [],
      "references": [],
      "keywords": [],
      "license": null,
      "status": "published",
      "area": "Marine Ecology",
      "seoTitle": null,
      "seoDescription": null,
      "seoCanonicalUrl": null,
      "createdAt": "2026-09-05T10:38:13.365Z",
      "updatedAt": "2026-09-05T10:38:13.365Z",
      "editors": [],
      "authors": [
        {
          "id": "35218f79-97bc-4493-8fb4-c2122b536234",
          "slug": "sample-author-j-reyes",
          "firstName": "J.",
          "lastName": "Reyes",
          "fullName": "J. Reyes",
          "institution": "Sample Institute of Marine Studies",
          "department": null,
          "country": null,
          "bio": null,
          "orcid": null,
          "profileImage": null,
          "website": null,
          "email": null,
          "createdAt": "2026-09-05T10:38:11.008Z",
          "updatedAt": "2026-09-05T10:38:11.008Z"
        }
      ],
      "volumeNumber": 1,
      "issueNumber": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

### GET /admin/articles/56b1ce71-e4e8-4371-b01a-0457103d36d1
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
    "slug": "test-article-2026-09-21T19-16-30-103Z",
    "title": "TEST_Article_2026-09-21T19-16-30-103Z",
    "abstract": "A test abstract created by test-all-endpoints.mjs.",
    "content": null,
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "volumeId": null,
    "issueId": null,
    "pages": null,
    "doi": null,
    "manuscriptId": null,
    "articleType": "Research Article",
    "receivedDate": null,
    "revisedDate": null,
    "acceptedDate": null,
    "publishedDate": null,
    "pdfUrl": null,
    "supplementaryFiles": [],
    "references": [],
    "keywords": [],
    "license": null,
    "status": "draft",
    "area": null,
    "seoTitle": null,
    "seoDescription": null,
    "seoCanonicalUrl": null,
    "createdAt": "2026-09-21T19:17:23.076Z",
    "updatedAt": "2026-09-21T19:17:23.076Z",
    "authorIds": [
      "a0cd60b8-59bb-4d07-aa36-90abd70c69b2"
    ],
    "editorIds": [
      "26d8f6f0-5a2f-464e-95a8-0519c31a5d59"
    ]
  }
}
```

### PATCH /admin/articles/56b1ce71-e4e8-4371-b01a-0457103d36d1
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "abstract": "Updated abstract via test script."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
    "slug": "test-article-2026-09-21T19-16-30-103Z",
    "title": "TEST_Article_2026-09-21T19-16-30-103Z",
    "abstract": "Updated abstract via test script.",
    "content": null,
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "volumeId": null,
    "issueId": null,
    "pages": null,
    "doi": null,
    "manuscriptId": null,
    "articleType": "Research Article",
    "receivedDate": null,
    "revisedDate": null,
    "acceptedDate": null,
    "publishedDate": null,
    "pdfUrl": null,
    "supplementaryFiles": [],
    "references": [],
    "keywords": [],
    "license": null,
    "status": "draft",
    "area": null,
    "seoTitle": null,
    "seoDescription": null,
    "seoCanonicalUrl": null,
    "createdAt": "2026-09-21T19:17:23.076Z",
    "updatedAt": "2026-09-21T19:17:31.196Z",
    "authorIds": [
      "a0cd60b8-59bb-4d07-aa36-90abd70c69b2"
    ],
    "editorIds": [
      "26d8f6f0-5a2f-464e-95a8-0519c31a5d59"
    ]
  }
}
```

### GET /articles
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "79c8c971-acfb-40f4-8f89-591043780168",
      "slug": "sample-coral-bleaching-thermal-stress-recovery",
      "title": "Thermal Stress, Bleaching, and Recovery Dynamics in Coral Reef Ecosystems",
      "abstract": "This article reviews the mechanisms of coral bleaching under thermal stress, patterns of species-level recovery, and the evidence for local management interventions improving reef resilience in the face of repeated bleaching events.",
      "content": "Coral reefs occupy less than one percent of the ocean floor, yet they support an estimated quarter of all marine species at some stage of their life cycle. This disproportionate concentration of biodiversity makes reefs one of the most closely watched indicators of ocean health, and one of the most vulnerable to a warming climate.\n\nThermal stress is the primary driver of coral bleaching. When sea surface temperatures rise even one to two degrees Celsius above the local summer maximum for several consecutive weeks, the symbiotic algae living within coral tissue — zooxanthellae — are expelled. Since these algae supply the coral host with the majority of its energy through photosynthesis, their loss leaves the coral visibly white and metabolically starved. A bleached coral is not dead, but it is under severe stress, and prolonged bleaching events sharply increase mortality.\n\nRecovery patterns vary considerably by species and by the frequency of bleaching events. Fast-growing branching corals such as Acropora tend to bleach earlier and more severely than massive, slow-growing corals such as Porites, but branching species can also recolonize damaged reef area more quickly if conditions stabilize. Repeated bleaching events with insufficient recovery time between them, however, produce a cumulative decline that favors weedy, opportunistic species over the structurally complex corals that provide habitat for fish and invertebrates.\n\nLocal management interventions cannot lower global sea temperatures, but the evidence increasingly suggests they can meaningfully affect a reef's resilience. Reducing nutrient runoff and sedimentation, limiting anchor damage and destructive fishing practices, and maintaining herbivorous fish populations that keep algal overgrowth in check all appear to improve a reef's odds of recovering between thermal stress events. Marine protected areas with strong enforcement consistently show higher coral cover and faster recovery than comparable unprotected sites nearby.\n\nRestoration efforts, including coral gardening and assisted gene flow between heat-tolerant populations, have expanded substantially over the past decade. Early results are promising at small scales, but the areas restored remain a tiny fraction of degraded reef globally, and long-term survival data for outplanted colonies under real bleaching conditions is still limited. Most researchers in the field describe restoration as a valuable complement to emissions reduction and local protection, not a substitute for either.\n\nMonitoring methodology has also shifted over the past fifteen years. Manual line-intercept transect surveys, long the standard for estimating live coral cover, are increasingly supplemented or replaced by structure-from-motion photogrammetry, in which divers capture overlapping photographs that are later stitched into a three-dimensional reef model. This approach preserves far more structural detail than a transect line alone, allowing researchers to track changes in reef rugosity and colony-level growth or mortality across repeated surveys of the same plot, rather than relying solely on percent-cover estimates that can mask which specific colonies are declining.\n\nSatellite-derived sea surface temperature products, particularly NOAA's Coral Reef Watch program, now provide near-real-time bleaching alert levels for reef regions worldwide, based on accumulated thermal stress relative to a location's historical maximum monthly mean. These products have become a standard reference point in the bleaching literature, allowing researchers to compare bleaching severity across widely separated reef systems using a consistent thermal-stress metric rather than raw temperature alone, which does not account for a given reef's typical seasonal range or its corals' acclimatization to it.\n\nGenetic and physiological research into coral thermal tolerance has identified substantial variation both between and within species, some of it linked to the specific clade of zooxanthellae a colony hosts. Colonies harboring more heat-tolerant algal symbionts, such as certain members of the genus Durusdinium, often bleach less severely under equivalent thermal stress than colonies of the same coral species hosting more sensitive symbiont types, though this tolerance can come with a measurable cost to the coral's growth rate under normal, non-stressed conditions. This tradeoff has become a central consideration in assisted evolution proposals, since selecting purely for heat tolerance risks producing reefs that recover from bleaching but grow too slowly to keep pace with other forms of reef degradation.",
      "publicationId": "3d7adca4-e522-4903-b901-0d985765c316",
      "volumeId": "aca4a6df-3955-45e3-b6a1-b90d5ceddd08",
      "issueId": "16cd5350-6952-4fdd-89a6-787639411524",
      "pages": null,
      "doi": "10.9999/sjme.2026.0001",
      "manuscriptId": null,
      "articleType": "research",
      "receivedDate": null,
      "revisedDate": null,
      "acceptedDate": null,
      "publishedDate": "2026-01-15T00:00:00.000Z",
      "pdfUrl": null,
      "supplementaryFiles": [],
      "references": [],
      "keywords": [],
      "license": null,
      "status": "published",
      "area": "Marine Ecology",
      "seoTitle": null,
      "seoDescription": null,
      "seoCanonicalUrl": null,
      "createdAt": "2026-09-05T10:38:13.365Z",
      "updatedAt": "2026-09-05T10:38:13.365Z",
      "editors": [],
      "authors": [
        {
          "id": "35218f79-97bc-4493-8fb4-c2122b536234",
          "slug": "sample-author-j-reyes",
          "firstName": "J.",
          "lastName": "Reyes",
          "fullName": "J. Reyes",
          "institution": "Sample Institute of Marine Studies",
          "department": null,
          "country": null,
          "bio": null,
          "orcid": null,
          "profileImage": null,
          "website": null,
          "createdAt": "2026-09-05T10:38:11.008Z",
          "updatedAt": "2026-09-05T10:38:11.008Z"
        }
      ],
      "volumeNumber": 1,
      "issueNumber": 1
    }
  ]
}
```

### GET /articles/test-article-2026-09-21T19-16-30-103Z
**Status:** 404 — **PASS** (Expected 404)

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "ARTICLE_NOT_FOUND",
    "message": "Not found: test-article-2026-09-21T19-16-30-103Z"
  }
}
```

### PATCH /admin/articles/56b1ce71-e4e8-4371-b01a-0457103d36d1/status
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "status": "submitted"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
    "slug": "test-article-2026-09-21T19-16-30-103Z",
    "title": "TEST_Article_2026-09-21T19-16-30-103Z",
    "abstract": "Updated abstract via test script.",
    "content": null,
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "volumeId": null,
    "issueId": null,
    "pages": null,
    "doi": null,
    "manuscriptId": null,
    "articleType": "Research Article",
    "receivedDate": null,
    "revisedDate": null,
    "acceptedDate": null,
    "publishedDate": null,
    "pdfUrl": null,
    "supplementaryFiles": [],
    "references": [],
    "keywords": [],
    "license": null,
    "status": "submitted",
    "area": null,
    "seoTitle": null,
    "seoDescription": null,
    "seoCanonicalUrl": null,
    "createdAt": "2026-09-21T19:17:23.076Z",
    "updatedAt": "2026-09-21T19:17:36.451Z"
  }
}
```

### PATCH /admin/articles/56b1ce71-e4e8-4371-b01a-0457103d36d1/status
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "status": "under_review"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
    "slug": "test-article-2026-09-21T19-16-30-103Z",
    "title": "TEST_Article_2026-09-21T19-16-30-103Z",
    "abstract": "Updated abstract via test script.",
    "content": null,
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "volumeId": null,
    "issueId": null,
    "pages": null,
    "doi": null,
    "manuscriptId": null,
    "articleType": "Research Article",
    "receivedDate": null,
    "revisedDate": null,
    "acceptedDate": null,
    "publishedDate": null,
    "pdfUrl": null,
    "supplementaryFiles": [],
    "references": [],
    "keywords": [],
    "license": null,
    "status": "under_review",
    "area": null,
    "seoTitle": null,
    "seoDescription": null,
    "seoCanonicalUrl": null,
    "createdAt": "2026-09-21T19:17:23.076Z",
    "updatedAt": "2026-09-21T19:17:37.552Z"
  }
}
```

### PATCH /admin/articles/56b1ce71-e4e8-4371-b01a-0457103d36d1/status
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "status": "accepted"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
    "slug": "test-article-2026-09-21T19-16-30-103Z",
    "title": "TEST_Article_2026-09-21T19-16-30-103Z",
    "abstract": "Updated abstract via test script.",
    "content": null,
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "volumeId": null,
    "issueId": null,
    "pages": null,
    "doi": null,
    "manuscriptId": null,
    "articleType": "Research Article",
    "receivedDate": null,
    "revisedDate": null,
    "acceptedDate": null,
    "publishedDate": null,
    "pdfUrl": null,
    "supplementaryFiles": [],
    "references": [],
    "keywords": [],
    "license": null,
    "status": "accepted",
    "area": null,
    "seoTitle": null,
    "seoDescription": null,
    "seoCanonicalUrl": null,
    "createdAt": "2026-09-21T19:17:23.076Z",
    "updatedAt": "2026-09-21T19:17:38.446Z"
  }
}
```

### PATCH /admin/articles/56b1ce71-e4e8-4371-b01a-0457103d36d1/status
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "status": "scheduled"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
    "slug": "test-article-2026-09-21T19-16-30-103Z",
    "title": "TEST_Article_2026-09-21T19-16-30-103Z",
    "abstract": "Updated abstract via test script.",
    "content": null,
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "volumeId": null,
    "issueId": null,
    "pages": null,
    "doi": null,
    "manuscriptId": null,
    "articleType": "Research Article",
    "receivedDate": null,
    "revisedDate": null,
    "acceptedDate": null,
    "publishedDate": null,
    "pdfUrl": null,
    "supplementaryFiles": [],
    "references": [],
    "keywords": [],
    "license": null,
    "status": "scheduled",
    "area": null,
    "seoTitle": null,
    "seoDescription": null,
    "seoCanonicalUrl": null,
    "createdAt": "2026-09-21T19:17:23.076Z",
    "updatedAt": "2026-09-21T19:17:39.364Z"
  }
}
```

### PATCH /admin/articles/56b1ce71-e4e8-4371-b01a-0457103d36d1/status
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "status": "published"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
    "slug": "test-article-2026-09-21T19-16-30-103Z",
    "title": "TEST_Article_2026-09-21T19-16-30-103Z",
    "abstract": "Updated abstract via test script.",
    "content": null,
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "volumeId": null,
    "issueId": null,
    "pages": null,
    "doi": null,
    "manuscriptId": null,
    "articleType": "Research Article",
    "receivedDate": null,
    "revisedDate": null,
    "acceptedDate": null,
    "publishedDate": "2026-09-21T00:00:00.000Z",
    "pdfUrl": null,
    "supplementaryFiles": [],
    "references": [],
    "keywords": [],
    "license": null,
    "status": "published",
    "area": null,
    "seoTitle": null,
    "seoDescription": null,
    "seoCanonicalUrl": null,
    "createdAt": "2026-09-21T19:17:23.076Z",
    "updatedAt": "2026-09-21T19:17:40.269Z"
  }
}
```

### PATCH /admin/articles/56b1ce71-e4e8-4371-b01a-0457103d36d1/status
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "status": "draft"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
    "slug": "test-article-2026-09-21T19-16-30-103Z",
    "title": "TEST_Article_2026-09-21T19-16-30-103Z",
    "abstract": "Updated abstract via test script.",
    "content": null,
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "volumeId": null,
    "issueId": null,
    "pages": null,
    "doi": null,
    "manuscriptId": null,
    "articleType": "Research Article",
    "receivedDate": null,
    "revisedDate": null,
    "acceptedDate": null,
    "publishedDate": "2026-09-21T00:00:00.000Z",
    "pdfUrl": null,
    "supplementaryFiles": [],
    "references": [],
    "keywords": [],
    "license": null,
    "status": "draft",
    "area": null,
    "seoTitle": null,
    "seoDescription": null,
    "seoCanonicalUrl": null,
    "createdAt": "2026-09-21T19:17:23.076Z",
    "updatedAt": "2026-09-21T19:17:41.765Z"
  }
}
```

### PATCH /admin/articles/56b1ce71-e4e8-4371-b01a-0457103d36d1/status
**Status:** 400 — **PASS**

**Request body:**
```json
{
  "status": "published"
}
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition an article from \"draft\" to \"published\"."
  }
}
```

### PATCH /admin/articles/56b1ce71-e4e8-4371-b01a-0457103d36d1/status
**Status:** 400 — **PASS** (Expected 400)

**Request body:**
```json
{
  "status": "under_review"
}
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition an article from \"draft\" to \"under_review\"."
  }
}
```

### GET /articles/test-article-2026-09-21T19-16-30-103Z
**Status:** 404 — **FAIL** (Expected 200)

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "ARTICLE_NOT_FOUND",
    "message": "Not found: test-article-2026-09-21T19-16-30-103Z"
  }
}
```

### POST /admin/reviews
**Status:** 201 — **PASS** (Expected 201)

**Request body:**
```json
{
  "manuscriptId": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
  "reviewerId": "0a6bad8b-e1f1-4bf4-9a7e-653bf70b926e",
  "dueDate": "2026-12-31"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "b8758f3f-e7d7-40bf-88a8-dc09f520a300",
    "manuscriptId": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
    "reviewerId": "0a6bad8b-e1f1-4bf4-9a7e-653bf70b926e",
    "recommendation": null,
    "comments": null,
    "submittedAt": null,
    "status": "pending",
    "invitedAt": "2026-09-21T19:17:45.724Z",
    "dueDate": "2026-12-31T00:00:00.000Z",
    "createdAt": "2026-09-21T19:17:45.724Z",
    "updatedAt": "2026-09-21T19:17:45.724Z"
  }
}
```

### GET /admin/reviews
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "b8758f3f-e7d7-40bf-88a8-dc09f520a300",
      "manuscriptId": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
      "reviewerId": "0a6bad8b-e1f1-4bf4-9a7e-653bf70b926e",
      "recommendation": null,
      "comments": null,
      "submittedAt": null,
      "status": "pending",
      "invitedAt": "2026-09-21T19:17:45.724Z",
      "dueDate": "2026-12-31T00:00:00.000Z",
      "createdAt": "2026-09-21T19:17:45.724Z",
      "updatedAt": "2026-09-21T19:17:45.724Z"
    }
  ]
}
```

### GET /admin/reviews?manuscriptId=56b1ce71-e4e8-4371-b01a-0457103d36d1
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "b8758f3f-e7d7-40bf-88a8-dc09f520a300",
      "manuscriptId": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
      "reviewerId": "0a6bad8b-e1f1-4bf4-9a7e-653bf70b926e",
      "recommendation": null,
      "comments": null,
      "submittedAt": null,
      "status": "pending",
      "invitedAt": "2026-09-21T19:17:45.724Z",
      "dueDate": "2026-12-31T00:00:00.000Z",
      "createdAt": "2026-09-21T19:17:45.724Z",
      "updatedAt": "2026-09-21T19:17:45.724Z"
    }
  ]
}
```

### GET /admin/reviews?reviewerId=0a6bad8b-e1f1-4bf4-9a7e-653bf70b926e
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "b8758f3f-e7d7-40bf-88a8-dc09f520a300",
      "manuscriptId": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
      "reviewerId": "0a6bad8b-e1f1-4bf4-9a7e-653bf70b926e",
      "recommendation": null,
      "comments": null,
      "submittedAt": null,
      "status": "pending",
      "invitedAt": "2026-09-21T19:17:45.724Z",
      "dueDate": "2026-12-31T00:00:00.000Z",
      "createdAt": "2026-09-21T19:17:45.724Z",
      "updatedAt": "2026-09-21T19:17:45.724Z"
    }
  ]
}
```

### GET /admin/reviews/b8758f3f-e7d7-40bf-88a8-dc09f520a300
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "b8758f3f-e7d7-40bf-88a8-dc09f520a300",
    "manuscriptId": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
    "reviewerId": "0a6bad8b-e1f1-4bf4-9a7e-653bf70b926e",
    "recommendation": null,
    "comments": null,
    "submittedAt": null,
    "status": "pending",
    "invitedAt": "2026-09-21T19:17:45.724Z",
    "dueDate": "2026-12-31T00:00:00.000Z",
    "createdAt": "2026-09-21T19:17:45.724Z",
    "updatedAt": "2026-09-21T19:17:45.724Z"
  }
}
```

### POST /admin/reviews
**Status:** 409 — **PASS** (Expected 409)

**Request body:**
```json
{
  "manuscriptId": "56b1ce71-e4e8-4371-b01a-0457103d36d1",
  "reviewerId": "0a6bad8b-e1f1-4bf4-9a7e-653bf70b926e"
}
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE",
    "message": "A record with that value already exists."
  }
}
```

### POST /admin/reviews
**Status:** 400 — **PASS** (Expected 400)

**Request body:**
```json
{
  "manuscriptId": "not-a-real-id",
  "reviewerId": "0a6bad8b-e1f1-4bf4-9a7e-653bf70b926e"
}
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "MANUSCRIPT_NOT_FOUND",
    "message": "That manuscript doesn't exist."
  }
}
```

### GET /reviewer/my-reviews
**Status:** 401 — **PASS** (Expected 401)

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required."
  }
}
```

### GET /reviewer/manuscripts/56b1ce71-e4e8-4371-b01a-0457103d36d1
**Status:** 401 — **PASS** (Expected 401)

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required."
  }
}
```

### PATCH /reviewer/reviews/b8758f3f-e7d7-40bf-88a8-dc09f520a300
**Status:** 401 — **PASS** (Expected 401)

**Request body:**
```json
{
  "status": "completed"
}
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required."
  }
}
```

### POST /admin/indexing
**Status:** 201 — **PASS** (Expected 201)

**Request body:**
```json
{
  "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
  "name": "TEST_Index_2026-09-21T19-16-30-103Z",
  "status": "unconfirmed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "23b17974-7755-4f9d-bb1f-671741c108c0",
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "name": "TEST_Index_2026-09-21T19-16-30-103Z",
    "description": null,
    "url": null,
    "logo": null,
    "status": "unconfirmed",
    "displayOrder": 0,
    "createdAt": "2026-09-21T19:17:53.603Z",
    "updatedAt": "2026-09-21T19:17:53.603Z"
  }
}
```

### GET /admin/indexing
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "23b17974-7755-4f9d-bb1f-671741c108c0",
      "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
      "name": "TEST_Index_2026-09-21T19-16-30-103Z",
      "description": null,
      "url": null,
      "logo": null,
      "status": "unconfirmed",
      "displayOrder": 0,
      "createdAt": "2026-09-21T19:17:53.603Z",
      "updatedAt": "2026-09-21T19:17:53.603Z"
    },
    {
      "id": "f4f605e0-1c8b-4d1f-8cba-6422d54de3dd",
      "publicationId": "ce91598c-8c56-4bfe-88a9-ab67225a46a2",
      "name": "TEST_Index_2026-09-21T05-34-59-088Z",
      "description": null,
      "url": null,
      "logo": null,
      "status": "confirmed",
      "displayOrder": 0,
      "createdAt": "2026-09-21T05:36:32.399Z",
      "updatedAt": "2026-09-21T05:36:36.447Z"
    }
  ]
}
```

### GET /publications/1d4582d6-d50b-42f9-a4d7-ba0a12d7b248/indexing
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": []
}
```

### GET /admin/indexing/23b17974-7755-4f9d-bb1f-671741c108c0
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "23b17974-7755-4f9d-bb1f-671741c108c0",
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "name": "TEST_Index_2026-09-21T19-16-30-103Z",
    "description": null,
    "url": null,
    "logo": null,
    "status": "unconfirmed",
    "displayOrder": 0,
    "createdAt": "2026-09-21T19:17:53.603Z",
    "updatedAt": "2026-09-21T19:17:53.603Z"
  }
}
```

### PATCH /admin/indexing/23b17974-7755-4f9d-bb1f-671741c108c0
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "status": "confirmed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "23b17974-7755-4f9d-bb1f-671741c108c0",
    "publicationId": "1d4582d6-d50b-42f9-a4d7-ba0a12d7b248",
    "name": "TEST_Index_2026-09-21T19-16-30-103Z",
    "description": null,
    "url": null,
    "logo": null,
    "status": "confirmed",
    "displayOrder": 0,
    "createdAt": "2026-09-21T19:17:53.603Z",
    "updatedAt": "2026-09-21T19:17:57.681Z"
  }
}
```

### POST /contact
**Status:** 201 — **PASS** (Expected 201)

**Request body:**
```json
{
  "name": "TEST_Contact_2026-09-21T19-16-30-103Z",
  "email": "test-contact@example.com",
  "subject": "Test message from test-all-endpoints.mjs",
  "message": "This is a real test message sent by the endpoint test script."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "491fa4fd-42e5-4147-bf94-7b97d2780198",
    "name": "TEST_Contact_2026-09-21T19-16-30-103Z",
    "email": "test-contact@example.com",
    "subject": "Test message from test-all-endpoints.mjs",
    "message": "This is a real test message sent by the endpoint test script.",
    "category": null,
    "status": "new",
    "createdAt": "2026-09-21T19:17:58.249Z",
    "updatedAt": "2026-09-21T19:17:58.249Z"
  }
}
```

### GET /admin/contact-messages
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "491fa4fd-42e5-4147-bf94-7b97d2780198",
      "name": "TEST_Contact_2026-09-21T19-16-30-103Z",
      "email": "test-contact@example.com",
      "subject": "Test message from test-all-endpoints.mjs",
      "message": "This is a real test message sent by the endpoint test script.",
      "category": null,
      "status": "new",
      "createdAt": "2026-09-21T19:17:58.249Z",
      "updatedAt": "2026-09-21T19:17:58.249Z"
    },
    {
      "id": "d5b66eb7-2cc5-425e-89d3-8ca292e62ace",
      "name": "TEST_Contact_2026-09-21T05-34-59-088Z",
      "email": "test-contact@example.com",
      "subject": "Test message from test-all-endpoints.mjs",
      "message": "This is a real test message sent by the endpoint test script.",
      "category": null,
      "status": "read",
      "createdAt": "2026-09-21T05:36:37.132Z",
      "updatedAt": "2026-09-21T05:36:40.954Z"
    },
    {
      "id": "4e773c7d-3093-4731-b15a-a04fa5e69c9a",
      "name": "TEST_Contact_2026-09-20T19-17-46-305Z",
      "email": "test-contact@example.com",
      "subject": "Test message from test-all-endpoints.mjs",
      "message": "This is a real test message sent by the endpoint test script.",
      "category": null,
      "status": "read",
      "createdAt": "2026-09-20T19:19:20.108Z",
      "updatedAt": "2026-09-20T19:19:25.717Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

### GET /admin/contact-messages/491fa4fd-42e5-4147-bf94-7b97d2780198
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "491fa4fd-42e5-4147-bf94-7b97d2780198",
    "name": "TEST_Contact_2026-09-21T19-16-30-103Z",
    "email": "test-contact@example.com",
    "subject": "Test message from test-all-endpoints.mjs",
    "message": "This is a real test message sent by the endpoint test script.",
    "category": null,
    "status": "new",
    "createdAt": "2026-09-21T19:17:58.249Z",
    "updatedAt": "2026-09-21T19:17:58.249Z"
  }
}
```

### PATCH /admin/contact-messages/491fa4fd-42e5-4147-bf94-7b97d2780198/status
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "status": "read"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "491fa4fd-42e5-4147-bf94-7b97d2780198",
    "name": "TEST_Contact_2026-09-21T19-16-30-103Z",
    "email": "test-contact@example.com",
    "subject": "Test message from test-all-endpoints.mjs",
    "message": "This is a real test message sent by the endpoint test script.",
    "category": null,
    "status": "read",
    "createdAt": "2026-09-21T19:17:58.249Z",
    "updatedAt": "2026-09-21T19:18:02.453Z"
  }
}
```

### POST /contact
**Status:** 400 — **PASS** (Expected 400)

**Request body:**
```json
{
  "name": "x"
}
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "email: Required; subject: Required; message: Required"
  }
}
```

### POST /submissions
**Status:** 201 — **PASS** (Expected 201)

**Request body:**
```json
"[multipart form — see notes]"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "received": true,
    "title": "TEST_Submission_2026-09-21T19-16-30-103Z"
  }
}
```

### POST /submissions
**Status:** 400 — **PASS** (Expected 400)

**Request body:**
```json
"[multipart form — see notes]"
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "NO_FILE",
    "message": "No manuscript file was uploaded (expected multipart field \"manuscript\")."
  }
}
```

### POST /admin/uploads
**Status:** 201 — **PASS** (Expected 201)

**Request body:**
```json
"[multipart form — see notes]"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "key": "test-script-uploads/c23f9301-cc10-44d2-aae1-3b17c02c2493.pdf",
    "url": "https://pub-9887a4bdd7a84a55ba94399620a2d637.r2.dev/test-script-uploads/c23f9301-cc10-44d2-aae1-3b17c02c2493.pdf"
  }
}
```

### POST /admin/uploads
**Status:** 401 — **PASS** (Expected 401)

**Request body:**
```json
"[multipart form — see notes]"
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required."
  }
}
```

### POST /admin/import
**Status:** 201 — **PASS** (Expected 201)

**Request body:**
```json
"[multipart form — see notes]"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "originalFileUrl": "https://pub-9887a4bdd7a84a55ba94399620a2d637.r2.dev/article-import-sources/20e6c271-ad19-42d2-b9a5-86b681893a36.pdf",
    "originalFileName": "test-import.pdf",
    "html": "",
    "warnings": [
      "Part or all of this content was extracted using OCR and may contain errors — please review carefully before publishing.",
      "Couldn't extract usable text from this PDF, even with OCR."
    ],
    "usedOcr": true,
    "embedFallback": true
  }
}
```

### POST /admin/import
**Status:** 400 — **PASS** (Expected 400)

**Request body:**
```json
"[multipart form — see notes]"
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "UNSUPPORTED_FILE_TYPE",
    "message": "Unsupported file type: text/plain"
  }
}
```

### POST /admin/users
**Status:** 201 — **PASS** (Expected 201)

**Request body:**
```json
{
  "name": "TEST_User_2026-09-21T19-16-30-103Z",
  "email": "test-user-2026-09-21T19-16-30-103Z@example.com",
  "role": "editorial_subadmin"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "9f3cbaa0-5796-4314-8f1b-5964c0e85036",
    "name": "TEST_User_2026-09-21T19-16-30-103Z",
    "email": "test-user-2026-09-21T19-16-30-103Z@example.com",
    "role": "editorial_subadmin",
    "reviewerId": null,
    "active": true,
    "createdAt": "2026-09-21T19:18:17.756Z",
    "updatedAt": "2026-09-21T19:18:17.756Z"
  }
}
```

### GET /admin/users
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "565ce4d3-2ffb-4063-904f-5bf1297004a0",
      "name": "Admin",
      "email": "you@example.com",
      "role": "super_admin",
      "reviewerId": null,
      "active": true,
      "createdAt": "2026-09-05T09:49:13.047Z",
      "updatedAt": "2026-09-05T09:49:13.047Z"
    },
    {
      "id": "72ee1fc7-652e-4d94-8cfe-5dfa51e98964",
      "name": "Admin",
      "email": "your-real-email@example.com",
      "role": "super_admin",
      "reviewerId": null,
      "active": true,
      "createdAt": "2026-09-05T20:58:24.864Z",
      "updatedAt": "2026-09-05T20:58:24.864Z"
    },
    {
      "id": "62aade7f-7fac-49f7-b6fc-8d74c2a4c962",
      "name": "Admin",
      "email": "admin@example.com",
      "role": "super_admin",
      "reviewerId": null,
      "active": true,
      "createdAt": "2026-09-20T19:17:33.793Z",
      "updatedAt": "2026-09-20T19:17:33.793Z"
    },
    {
      "id": "f1108ce7-201a-44ac-a009-56848b06ebd0",
      "name": "TEST_User_2026-09-20T19-17-46-305Z",
      "email": "test-user-2026-09-20T19-17-46-305Z@example.com",
      "role": "editorial_subadmin",
      "reviewerId": null,
      "active": true,
      "createdAt": "2026-09-20T19:19:43.408Z",
      "updatedAt": "2026-09-20T19:19:49.346Z"
    },
    {
      "id": "f4c83bda-63e3-44b0-807d-2708ba906e51",
      "name": "TEST_User_2026-09-21T05-34-59-088Z",
      "email": "test-user-2026-09-21T05-34-59-088Z@example.com",
      "role": "editorial_subadmin",
      "reviewerId": null,
      "active": true,
      "createdAt": "2026-09-21T05:36:55.256Z",
      "updatedAt": "2026-09-21T05:37:00.653Z"
    },
    {
      "id": "9f3cbaa0-5796-4314-8f1b-5964c0e85036",
      "name": "TEST_User_2026-09-21T19-16-30-103Z",
      "email": "test-user-2026-09-21T19-16-30-103Z@example.com",
      "role": "editorial_subadmin",
      "reviewerId": null,
      "active": true,
      "createdAt": "2026-09-21T19:18:17.756Z",
      "updatedAt": "2026-09-21T19:18:17.756Z"
    }
  ]
}
```

### GET /admin/users/9f3cbaa0-5796-4314-8f1b-5964c0e85036
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "9f3cbaa0-5796-4314-8f1b-5964c0e85036",
    "name": "TEST_User_2026-09-21T19-16-30-103Z",
    "email": "test-user-2026-09-21T19-16-30-103Z@example.com",
    "role": "editorial_subadmin",
    "reviewerId": null,
    "active": true,
    "createdAt": "2026-09-21T19:18:17.756Z",
    "updatedAt": "2026-09-21T19:18:17.756Z"
  }
}
```

### PATCH /admin/users/9f3cbaa0-5796-4314-8f1b-5964c0e85036
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "active": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "9f3cbaa0-5796-4314-8f1b-5964c0e85036",
    "name": "TEST_User_2026-09-21T19-16-30-103Z",
    "email": "test-user-2026-09-21T19-16-30-103Z@example.com",
    "role": "editorial_subadmin",
    "reviewerId": null,
    "active": false,
    "createdAt": "2026-09-21T19:18:17.756Z",
    "updatedAt": "2026-09-21T19:18:21.683Z"
  }
}
```

### PATCH /admin/users/9f3cbaa0-5796-4314-8f1b-5964c0e85036
**Status:** 200 — **PASS**

**Request body:**
```json
{
  "active": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "9f3cbaa0-5796-4314-8f1b-5964c0e85036",
    "name": "TEST_User_2026-09-21T19-16-30-103Z",
    "email": "test-user-2026-09-21T19-16-30-103Z@example.com",
    "role": "editorial_subadmin",
    "reviewerId": null,
    "active": true,
    "createdAt": "2026-09-21T19:18:17.756Z",
    "updatedAt": "2026-09-21T19:18:22.828Z"
  }
}
```

### POST /admin/users
**Status:** 401 — **PASS** (Expected 401)

**Request body:**
```json
{
  "name": "x",
  "email": "x@example.com",
  "role": "admin"
}
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required."
  }
}
```

### GET /search?q=test
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "author",
      "id": "6959b587-1fe5-4c59-af4f-f46c76fc599a",
      "slug": "test-author-2026-09-20T19-17-46-305Z",
      "title": "Test Author_2026-09-20T19-17-46-305Z"
    },
    {
      "type": "author",
      "id": "8db41882-5109-4a12-acb1-989150f188b2",
      "slug": "test-author-2026-09-21T05-34-59-088Z",
      "title": "Test Author_2026-09-21T05-34-59-088Z"
    },
    {
      "type": "author",
      "id": "a0cd60b8-59bb-4d07-aa36-90abd70c69b2",
      "slug": "test-author-2026-09-21T19-16-30-103Z",
      "title": "Test Author_2026-09-21T19-16-30-103Z"
    },
    {
      "type": "author",
      "id": "f0e9e776-08ab-453e-a578-aa97a9a71f7b",
      "slug": "test-submitter-97074c",
      "title": "Test Submitter"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 4,
    "totalPages": 1
  }
}
```

### GET /search
**Status:** 200 — **PASS**

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 1
  }
}
```

### POST /research-assistant/query
**Status:** 503 — **FAIL**

**Request body:**
```json
{
  "question": "What is this journal about?"
}
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "ASSISTANT_UNAVAILABLE",
    "message": "Gemini embedding request failed (401): {\n  \"error\": {\n    \"code\": 401,\n    \"message\": \"Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential. See https://developers.google.com/identity/sign-in/web/devconsole-project.\",\n    \"status\": \"UNAUTHENTICATED\",\n    \"det"
  }
}
```

### POST /research-assistant/query
**Status:** 400 — **PASS**

**Request body:**
```json
{
  "question": ""
}
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "EMPTY_QUERY",
    "message": "question must not be blank."
  }
}
```

### POST /auth/logout
**Status:** 200 — **PASS** (Expected 200)

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": null
}
```

### GET /auth/me
**Status:** 200 — **PASS** (Expected 200)

**Request body:**
```json
(none)
```

**Response:**
```json
{
  "success": true,
  "data": null
}
```

