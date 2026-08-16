# Worked example

The request: *"Let support staff search orders by customer email."* One sentence, and a BRD
is several pages. Below is the whole interview, including the part that happens before any
question is asked.

## The decisions behind the artifact

Not questions yet — the choices the BRD will commit to whether or not anyone names them:

| Decision | Depends on |
| -------- | ---------- |
| D1 Who can search | — |
| D2 What counts as success | — |
| D3 Whether results include cancelled and archived orders | — |
| D4 Whether partial email matching is in scope | — |
| D5 What happens to customer-facing rate limiting | D1 |
| D6 Which audit obligations apply | D1 |
| D7 The retention window search reaches back over | D3 |

D5 and D6 hang off D1 because they only exist if customers can search. D7 hangs off D3
because archived orders are the only reason a window is a question at all.

## Facts, found rather than asked

- `src/orders/` has no search path today; order lookup is by id only.
- The constitution sets a p95 of 400 ms for list endpoints, so D2 has a house baseline.
- Orders carry a `status` enum including `cancelled` and `archived`, so D3 is a real choice
  and not a hypothetical.

None of that is a question. Three fewer questions is the point of step 2.

## Round 1 — the frontier is D1 to D4

**Q1 — Who can search**

Support staff only, or customers too? Customer-facing search puts authentication and rate
limiting into the FRD and roughly doubles the test surface.

**Recommend:** support staff only, customers explicitly out of scope this iteration.

**Q2 — What counts as success**

The BRD needs a metric with a baseline and a target. Support currently opens an order by
asking the customer for an order number, which fails when they do not have it.

**Recommend:** median time to locate an order under 30 seconds, from a measured baseline in
the first week, with the share of contacts that cannot be resolved as the secondary metric.

**Q3 — Cancelled and archived orders**

Including them makes the result set complete but noisier, and archived orders raise a
retention question. Excluding them means a support call about a cancelled order still fails.

**Recommend:** include cancelled, exclude archived, and treat archived as a later iteration.

**Q4 — Partial email matching**

Exact match only, or prefix and substring? Substring search on email is the difference
between an index lookup and a scan, which lands on the NFRs.

**Recommend:** exact match for this iteration.

## What came back

> 1 support staff only. 2 fine. 3 include both actually, archived matter to finance. 4 yes
> partial, they mistype constantly.

D1 to D4 settled. Note that two recommendations were overruled — which is the interview
working, not failing.

## Round 2 — the frontier recomputes

D5 and D6 are now moot: no customer access means no customer rate limiting and no new audit
obligation beyond the existing staff access log. They leave the tree rather than becoming
questions.

D7 is live, because archived orders came into scope. Partial matching also produced a new
decision that did not exist in round 1 — this is normal, answers reshape the tree.

**Q5 — How far back search reaches**

Archived orders are in scope, so the window is a business decision with a cost: full history
means the search index carries every order ever placed.

**Recommend:** 24 months, with older orders reachable by order id as they are today.

**Q6 — What partial matching means to a reviewer**

"They mistype constantly" reads as prefix matching (`jane.smi`) rather than substring
(`smith` finding `jane.smith@`). Substring cannot use an index and needs its own NFR.

**Recommend:** prefix matching, stated in the BRD as a business capability and left to the
FRD to specify.

## Where it ends

> 5 yes 24 months. 6 whatever is fastest.

Q6's answer is a preference, not a decision, so the recommendation stands and is recorded:

```
ASSUMPTION: partial email matching means prefix matching, not substring. Substring
matching cannot use an index and would need its own NFR. Confirmed as "whatever is
fastest" rather than as a business requirement.
```

The frontier is empty after two rounds. Seven decisions: five settled by the user, one
dropped as moot, one recorded as an assumption with the reason it was made. That ratio is
what goes in the handoff.
