## Software Architecture Document

### Revision history

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 25/08/2026 | 0.1 | Initial version | Gustavo de Freitas Fidélis, Bernardo Lykawka Medeiros da Silva |

## 1. Introduction

### 1.1 Purpose
This document presents an overview of the software architecture for the ViajaJunto system and establishes architectural decisions relevant to its development.

### 1.2 Scope
This document covers the architecture of ViajaJunto, a web application for collaborative trip planning. It should be followed by the development team to maintain the proposed architecture, including separation between frontend and backend, database organization, and access control.

### 1.3 Definitions and abbreviations

| Abbreviation | Definition |
| ----------- | ---------- |
| API | Application Programming Interface |
| REST | Representational State Transfer |
| JWT | JSON Web Token |
| ERD | Entity-Relationship Diagram |
| DLD | Logical Data Diagram |
| MVC | Model-View-Controller |

## 2. Architectural representation

The application follows a client-server architecture with clear separation of concerns:

- Frontend: responsive web application that consumes the backend REST API and renders the interface.
- Backend: REST API responsible for business logic, authentication, authorization, persistence, and integration orchestration.
- Maps service: handles interactive map display and routing.
- Places/activities service: integrates external APIs to enrich local data and discover activities.
- Database: relational storage for users, trips, destinations, activities, budgets, and reviews.

## 3. Architecture goals and constraints

| Constraint | Tool or decision |
| ---------- | ---------------- |
| Language | To be defined by the team |
| Framework | To be defined by the team |
| Platform | Web browser |
| Security | Password hash; JWT authentication; trip-level authorization |
| Language of interface | Portuguese (pt-BR) |
| Interactive map | Example: jsVectormap or Google Maps API |

## 4. Logical view

The system is organized into five main blocks:

- Presentation layer (frontend): responsible for the user interface and map interactions.
- Business layer (backend/API): responsible for business rules, authentication, permissions, and orchestration.
- Maps service: encapsulates geolocation, routes, and markers.
- Activities service: integrates with external APIs to enrich activity information.
- Data layer (database): responsible for persistence of users, trips, destinations, activities, budgets, and evaluations.

## 5. Implementation view

### 5.1 Entity-relationship model

The relational model is composed of the following entities:

- `user`
- `trip`
- `trip_member`
- `destination_catalog`
- `trip_destination`
- `activity_catalog`
- `trip_activity`
- `budget`
- `review`

### 5.2 Data model summary

```
user(#id, name, email, password_hash, created_at)

trip(#id, name, description, start_date, end_date, status, *created_by->user, created_at)

trip_member(#id, *trip_id->trip, *user_id->user, permission, joined_at)

destination_catalog(#id, name, country, category, description, latitude, longitude, photo_url)

trip_destination(#id, *trip_id->trip, *destination_catalog_id->destination_catalog, arrival, departure, description, order)

activity_catalog(#id, name, description, activity_type, location, city, country, latitude, longitude, google_place_id, photo_url, source, average_rating, created_at)

trip_activity(#id, *trip_destination_id->trip_destination, *activity_catalog_id->activity_catalog, date_time, duration_minutes, expected_cost, status)

budget(#id, *trip_id->trip, total_value, planned_activities)

review(#id, *user_id->user, *activity_catalog_id->activity_catalog, rating, comment, created_at)
```

> Legend: `#` primary key, `*` foreign key

## 6. Size and performance

The system is intended for a general audience and must support multiple simultaneous users working on shared trips. The main pages should load in less than 3 seconds under normal network conditions.

## 7. Quality attributes

The client-server architecture with frontend/server separation supports:

- Maintainability: each layer can evolve independently.
- Testability: the API can be tested in isolation.
- Security: access control is centralized in the backend.
- Scalability: frontend and backend can scale independently.

## 8. References

- Project scope document — ViajaJunto
- Requirements document — ViajaJunto
