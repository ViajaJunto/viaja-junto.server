# Happy path: trying the API end to end

A guided tour of the main flow, meant for someone who wants to **see the API
work** (for example, to grade it). It starts everything with one command, needs
no configuration and no Google account, and every step is a command you can
paste. Each step says what you should see.

The flow: browse the catalog → see a trip that is already scheduled → plan a new
trip (destination, activity, budget) → share an expense → complete the trip and
review it → upload a photo.

> The sign-in of the real product is Google. For the tour the demo gives you a
> **ready-made access token** for a demo user, which the API accepts exactly like
> one it would issue after a Google sign-in. Everything else is the real API.

## 1. Start it

Requirements: **Docker** with Compose v2, and ports **3000** (API) and **4566**
(emulated S3) free.

```bash
npm run demo
```

No Node on the machine? This is the same thing:

```bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d --build --wait
```

The first run builds the images and takes a couple of minutes; later runs take
seconds. It starts PostgreSQL, applies the migrations, starts the emulated AWS
S3 (MiniStack) for photos, loads the demo data and starts the API. When it
finishes, `npm run demo` prints the URLs and a **token**. To see them again:

```bash
npm run demo:info
```

Without Node, the token is in the log of the step that loaded the data:

```bash
docker logs viajajunto-seed | tail -2
```

What the demo data contains:

| What | How much |
| ---- | -------- |
| User | 1 (`admin@demo.viajajunto.dev`, an administrator, so it can also write to the catalogs) |
| Destination catalog | 64 cities with coordinates (Paris, Roma, Londres, Tóquio...) |
| Activity catalog | 930 places (tours, restaurants, hotels), each linked to its city |
| A scheduled trip | "Eurotrip 2027": Paris, Roma and Barcelona, 21 planned activities and a budget |

## 2. Set up your terminal

The commands below use `curl`. Paste your token in `TOKEN`; the ids are fixed,
the demo data always has the same ones.

```bash
API=http://localhost:3000/api
TOKEN=<paste the token here>

# Fixed ids of the demo data
ME=682d7d27-30e3-4770-9947-7346a42bac40
PARIS=3b9d062b-f100-41ef-a525-0adcaa979f52
LISBOA=428a4f43-8818-4d02-a134-1364298b4471
EUROTRIP=b6ef4b65-c44f-4a3b-8c7b-a31e7516fd99
LOUVRE=28a81b3f-b568-4316-909a-7c32252a162e
EIFFEL=153e1725-f4c7-492f-abee-fecdd46347f6
ALFAMA=c5311ffe-8c08-4cfa-bdaf-38b73c9931be

# Reads the "id" of a created resource from the JSON answer
id_of() { sed -E 's/^\{"id":"([^"]+)".*/\1/'; }
```

Prefer a browser? Open **<http://localhost:3000/docs>**, click *Authentication*,
choose *Bearer*, paste the token, and use each endpoint with its "Test Request"
button. The steps below are the same calls.

## 3. Check that it is up

```bash
curl -s $API/health
```

You should see `{"status":"ok", ...}` with the database `up`. Then confirm who
you are:

```bash
curl -s -H "Authorization: Bearer $TOKEN" $API/auth/me
```

You should see the demo user, with `"role":"ADMIN"`. Without the header the same
call answers **401**.

## 4. Browse the catalog (public)

The catalog can be read **without a token**, so a visitor can explore before
signing up.

```bash
# destinations, 3 per page (note the { data, meta } pagination)
curl -s "$API/destination-catalog?limit=3"

# filter by country and by category
curl -s "$API/destination-catalog?country=Itália&category=CULTURAL"

# the public page of a destination: rating, review count and latest reviews
curl -s $API/destination-catalog/$PARIS/details

# activities of a destination, filtered by type
curl -s "$API/activity-catalog?destinationId=$PARIS&type=TOUR"

# the public page of an activity
curl -s $API/activity-catalog/$LOUVRE/details
```

Destinations and activities are separate catalogs: a **destination** is a city,
and **activities** are the places in it, linked by `destinationId`.

## 5. See the scheduled trip

Everything about a trip is reached with the token; only its members can see it.

```bash
# my trips: "Eurotrip 2027", with "role":"OWNER"
curl -s -H "Authorization: Bearer $TOKEN" $API/trips

# its itinerary: three stops, in order, each pointing at a destination of the catalog
curl -s -H "Authorization: Bearer $TOKEN" "$API/trip-destinations?tripId=$EUROTRIP"

# the planned activities of the first stop (Paris)
STOP1=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/trip-destinations?tripId=$EUROTRIP" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
curl -s -H "Authorization: Bearer $TOKEN" "$API/trip-activities?tripDestinationId=$STOP1"

# the budget, and how much of it is planned
curl -s -H "Authorization: Bearer $TOKEN" $API/trips/$EUROTRIP/budget/summary
```

The summary shows `totalValue` (the budget), `planned` (the sum of what the
planned activities are expected to cost), `remaining` and `overBudget`, plus the
spending by category (tours, food, lodging).

A trip stop and a planned activity hold only what is specific to the trip (dates,
cost, status); the name, place and coordinates come from the catalog entry they
reference.

## 6. Plan a new trip

```bash
# create the trip
TRIP=$(curl -s -X POST $API/trips -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Lisboa 2026","description":"Uma semana em Lisboa","startDate":"2026-09-01","endDate":"2026-09-08","currency":"BRL"}' | id_of)
echo $TRIP

# add a destination of the catalog to it
STOP=$(curl -s -X POST $API/trip-destinations -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"tripId\":\"$TRIP\",\"destinationCatalogId\":\"$LISBOA\",\"arrival\":\"2026-09-01\",\"departure\":\"2026-09-08\",\"order\":0}" | id_of)
echo $STOP

# plan an activity of the catalog in that stop, with its expected cost
curl -s -X POST $API/trip-activities -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"tripDestinationId\":\"$STOP\",\"activityCatalogId\":\"$ALFAMA\",\"dateTime\":\"2026-09-02T10:00:00Z\",\"durationMinutes\":180,\"expectedCost\":120.50}"

# set the budget, then read the summary
curl -s -X POST $API/budgets -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"tripId\":\"$TRIP\",\"totalValue\":3000}"
curl -s -H "Authorization: Bearer $TOKEN" $API/trips/$TRIP/budget/summary
```

Each creation answers **201** with the new resource. The summary now shows
`planned: 120.5` and `remaining: 2879.5`.

Invalid data is refused with **422** and a list of what is wrong, for example a
trip without a name:

```bash
curl -s -X POST $API/trips -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":""}'
```

## 7. Share an expense

Expenses are in minor units (cents), and are split among the trip's people. The
demo has one person, so it is split with yourself; with more members the summary
also says who owes whom.

```bash
curl -s -X POST $API/trip-expenses -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"tripId\":\"$TRIP\",\"payerId\":\"$ME\",\"amount\":24000,\"description\":\"Jantar em Alfama\",\"split\":{\"type\":\"equal\",\"participants\":[\"$ME\"]}}"

curl -s -H "Authorization: Bearer $TOKEN" $API/trips/$TRIP/expenses/summary
```

## 8. Complete the trip and review it

Only someone who **completed a trip with that destination** can review it. First,
before the trip is completed:

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST $API/destination-reviews -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"destinationId\":\"$LISBOA\",\"rating\":5,\"comment\":\"Cidade linda\"}"
```

You should see **403**. Complete the trip and review again:

```bash
curl -s -X PATCH $API/trips/$TRIP -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"status":"COMPLETED"}'

curl -s -w "\nHTTP %{http_code}\n" -X POST $API/destination-reviews -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"destinationId\":\"$LISBOA\",\"rating\":5,\"comment\":\"Cidade linda\"}"
```

This time **201**. A second review of the same destination by the same person is
refused with **409** (so, to repeat the tour, run `npm run demo:reset` first,
or the review you expect to be 201 will already be a 409). Activities have their own reviews:

```bash
curl -s -X POST $API/reviews -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"activityId\":\"$ALFAMA\",\"rating\":4,\"comment\":\"Vale a caminhada\"}"
```

The destination and the activity each keep **their own rating**, kept in step
with their reviews. See them on the public pages and in the ranking:

```bash
curl -s $API/destination-catalog/$LISBOA/details
curl -s $API/activity-catalog/$ALFAMA/details
curl -s "$API/destination-catalog/top?limit=3"
```

`averageRating` is `5` and `reviewCount` is `1` for Lisboa, the review appears
with the author's name only (never the email), and Lisboa leads the top list.

## 9. Upload a photo

The demo has an emulated S3 (MiniStack). As an administrator you can set a
destination's photo:

```bash
curl -s -X PUT $API/destination-catalog/$LISBOA/photo -H "Authorization: Bearer $TOKEN" \
  -F "file=@prisma/seed-assets/destinations/london.jpg;type=image/jpeg"
```

The answer has a `photoUrl` (on `http://localhost:4566/...`); open it in the
browser to see the image. Anything that is not a JPEG, PNG or WebP image, or is
too large, is refused.

## 10. Find activities for a destination (optional)

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$API/destination-catalog/$PARIS/activities?type=TOUR&limit=5"
```

The catalog is read first: Paris already has enough places, so the answer comes
from the database (`"imported":0`). When it does not, the API asks Google Places
for more around the destination and saves them in the catalog. That step needs a
Google Places API key (`GOOGLE_PLACES_API_KEY`); without one, asking for more
than the catalog has answers **503** saying so. If you set a key (in the
environment or in `.env`, which Compose reads), a request for more than the
catalog has makes a real, billed Google request, so ask for what you need.

## 11. Stop it

```bash
npm run demo:down     # stops it; the data is kept for the next run
npm run demo:reset    # stops it and deletes the data
```

## What this showed

| Rule | Where |
| ---- | ----- |
| Public reading, protected writing (401 without a token) | steps 3, 4, 5 |
| Pagination, filters and a consistent `{ data, meta }` envelope | step 4 |
| Trips are private to their members; roles (`OWNER`) | step 5 |
| Trip stops and activities reference the catalog | steps 5, 6 |
| Budget summary: planned against budget, by category | steps 5, 6 |
| Validation answers 422 with the problems | step 6 |
| Expenses in minor units, split among the members | step 7 |
| Only who completed a trip reviews its destination (403, 201, 409) | step 8 |
| Ratings derived from the reviews, public pages and ranking | step 8 |
| Photo upload to S3, administrators only | step 9 |

## If something does not work

| Symptom | Cause and fix |
| ------- | ------------- |
| `port is already allocated` (3000 or 4566) | Another API or MiniStack is running. Stop it, then run `npm run demo` again |
| **401** on every call | The token is wrong or older than 24 hours. Run `npm run demo:info` for a new one, and use the same terminal where you set `TOKEN` |
| `npm run demo` waits for a long time on the first run | It is building the images; follow it with `docker compose -f docker-compose.yml -f docker-compose.demo.yml logs -f` |
| The photo step answers 503 | The emulated S3 is not up. `docker ps` should list `viajajunto-ministack` as healthy |
| You want to start from scratch | `npm run demo:reset`, then `npm run demo` |
