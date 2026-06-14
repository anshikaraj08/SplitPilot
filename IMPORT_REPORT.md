# SplitPilot Import Report

Source file: `data/Expenses Export.csv`

Importer result: 42 rows checked, 22 anomalies surfaced.

| Row | Description | Action | Anomalies |
| --- | --- | --- | --- |
| 6 | dinner - marina bites | review_required | `EXACT_DUPLICATE`: skipped as duplicate candidate |
| 7 | Electricity Feb | posted_expense | `FORMATTED_AMOUNT`: parsed as 1200 |
| 9 | Movie night snacks | posted_expense | `NAME_NORMALIZED`: used Priya |
| 10 | Cylinder refill | posted_expense | `SUB_PAISE_AMOUNT`: rounded to 900 |
| 11 | Groceries DMart | posted_expense | `NAME_NORMALIZED`: used Priya |
| 14 | Rohan paid Aisha back | posted_payment | `SETTLEMENT_IN_EXPENSE_EXPORT`: classified as payment |
| 15 | Pizza Friday | posted_expense | `PERCENTAGE_TOTAL_NOT_100`: normalized percentages proportionally |
| 20 | Goa villa booking | posted_expense | `USD_CONVERSION`: converted 540 USD to INR |
| 21 | Beach shack lunch | posted_expense | `USD_CONVERSION`: converted 84 USD to INR |
| 23 | Parasailing | posted_expense | `NAME_NORMALIZED`: used Kabir; `USD_CONVERSION`: converted 150 USD to INR |
| 25 | Thalassa dinner | review_required | `POSSIBLE_DUPLICATE_DIFFERENT_AMOUNT`: resembles another dinner row but amount differs |
| 26 | Parasailing refund | posted_expense | `NEGATIVE_AMOUNT`: posted as negative refund; `USD_CONVERSION`: converted -30 USD to INR |
| 27 | Airport cab | posted_expense | `AMBIGUOUS_DATE_FORMAT`: normalized to 2026-03-14; `NAME_NORMALIZED`: used Rohan |
| 28 | Groceries DMart | posted_expense | `MISSING_CURRENCY`: set to INR |
| 31 | Dinner order Swiggy | review_required | `ZERO_AMOUNT`: skipped row |
| 32 | Weekend brunch | posted_expense | `PERCENTAGE_TOTAL_NOT_100`: normalized percentages proportionally |
| 36 | Groceries BigBasket | posted_expense | `INACTIVE_MEMBER_ON_DATE`: explicit CSV participant kept and flagged |
| 38 | Sam deposit share | posted_payment | `SETTLEMENT_IN_EXPENSE_EXPORT`: classified as payment |
| 42 | Furniture for common room | posted_expense | `SPLIT_DETAILS_IGNORED_FOR_EQUAL`: used equal split |

Rows without listed anomalies passed the importer policy and are eligible for posting.
