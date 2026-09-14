## Requirements Document

### Revision history

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 25/08/2026 | 0.1 | Initial version | Gustavo de Freitas Fidélis, Bernardo Lykawka Medeiros da Silva |

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements of the ViajaJunto system and serves as a reference for development and validation. Its objective is to clearly describe what the system should do and the technical and quality constraints it must meet.

### 1.2 Scope
ViajaJunto is a web application for collaborative travel planning. The platform allows groups of users to organize itineraries with multiple destinations, activities, and budgets in one shared environment, with an interactive map and a community review system.

### 1.3 Definitions and acronyms

| Term | Definition |
| ---- | --------- |
| FR | Functional Requirement |
| NFR | Non-Functional Requirement |
| BR | Business Rule |
| JWT | JSON Web Token |
| DER | Entity-Relationship Diagram |
| REST | Representational State Transfer |
| API | Application Programming Interface |

## 2. Product overview

### 2.1 Product perspective
ViajaJunto is a new system without replacement of an existing product. It integrates itinerary planning, collaborative trip management, budget control, and destination discovery in a single platform.

### 2.2 Main features
- Create and manage trips with multiple destinations and activities
- Collaborate between members with different access levels
- View destinations in an interactive map
- Control the trip budget with summary dashboards
- Review and discover destinations and activities

## 3. Functional requirements

### Module 1 — Authentication and profile

| ID | Description | Priority |
| -- | ----------- | :------: |
| FR01 | The system must allow user registration with name, email, and password. | High |
| FR02 | The system must allow login and logout. | High |
| FR03 | The system must allow password recovery by email. | Medium |

### Module 2 — Trip management

| ID | Description | Priority |
| -- | ----------- | :------: |
| FR04 | The system must allow creating a trip with name, description, and date range. | High |
| FR05 | The system must allow editing and deleting trips. | High |
| FR06 | The system must show a personal dashboard listing all trips of the user. | High |
| FR07 | The system must allow setting trip status as planning, confirmed, or completed. | Medium |

### Module 3 — Destinations

| ID | Description | Priority |
| -- | ----------- | :------: |
| FR08 | The system must allow adding multiple destinations to a trip with an ordered visit sequence. | High |
| FR09 | Each destination must include photo, name, location, dates, description, and category. | High |
| FR10 | The system must allow searching for previously registered destinations. | Medium |
| FR11 | The system must show countries visited by the user on a map. | Medium |

### Module 4 — Activities

| ID | Description | Priority |
| -- | ----------- | :------: |
| FR12 | The system must allow adding activities within each destination. | High |
| FR13 | Each activity may include photo, name, category, location, date, estimated duration, expected cost, and status. | High |
| FR14 | The system must list activities in chronological order per destination. | Medium |

### Module 5 — Budget

| ID | Description | Priority |
| -- | ----------- | :------: |
| FR15 | The system must allow defining a total trip budget. | High |
| FR16 | The system must record expected spending for activities. | High |
| FR17 | The system must display a summary with total budget, planned amount, remaining balance, and category consumption. | Medium |

### Module 6 — Collaboration

| ID | Description | Priority |
| -- | ----------- | :------: |
| FR18 | The system must allow trip creators to invite other users using the trip code. | High |
| FR19 | The system must provide two permission levels: Editor and Viewer. | High |
| FR20 | The system must allow creators to change permissions or remove collaborators at any time. | High |
| FR21 | The system must send in-app notifications when relevant changes happen. | Medium |

### Module 7 — Reviews and discovery

| ID | Description | Priority |
| -- | ----------- | :------: |
| FR22 | The system must allow users to rate activities with a 1 to 5 score and an optional comment. | High |
| FR23 | The system must display a public activity page with description, average rating, reviews, and photos. | High |
| FR24 | The system must offer a catalog search with filters by name, minimum rating, category, and location. | Medium |
| FR25 | The system must highlight the highest-rated destinations on the home page. | Low |

## 4. Non-functional requirements

| ID | Category | Description | Priority |
| -- | -------- | ----------- | :------: |
| NFR01 | Usability | The system must be responsive and work on desktop and mobile devices. | High |
| NFR02 | Performance | The system must load main pages in under 3 seconds under normal network conditions. | High |
| NFR03 | Security | Passwords must be hashed. Authentication must use tokens. Access control must restrict access to user-owned or invited trips. | High |
| NFR04 | Availability | The system must be available through a browser without installation. | High |
| NFR05 | Maintainability | The system must maintain a clear separation between backend and frontend. | Medium |

## 5. Business rules

| ID | Description |
| -- | ----------- |
| BR01 | Unauthenticated visitors may browse destination and review catalogs but cannot create trips or leave reviews. |
| BR02 | Collaborators with Editor permissions may add, edit, and remove destinations, activities, and budget information. |
| BR03 | Collaborators with Viewer permission only have read access. |
| BR04 | Only the trip creator may invite collaborators, change permissions, or remove them. |
| BR05 | Only registered users may review destinations and activities. |
| BR06 | A user may access a trip only if they are the creator or a collaborator. |
