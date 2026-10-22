---
title: SparkLayer was offline due to a global PHP security issue
impact: major
affects: [frontend, dashboard, api: minor]
# When the outage began, in UK time (e.g. 2026-10-21 14:30). Until it's set, the page says "First update" instead of "Started".
# started: 2026-10-21 00:00
---
SparkLayer was offline because of a [critical security issue in PHP](https://www.ncsc.gov.uk/news/critical-security-issue-affecting-php) that affected a large part of the internet. We kept our services offline until the security patch was installed and verified on our platform. We found no evidence that SparkLayer or your data was affected.

## 2026-10-22 10:55 · Resolved
SparkLayer is back online, and all services are working normally.

**What we’ve done**
Our own engineering team verified the patch was live before bringing services back up. That included confirming the fix is live on every server and testing it against the known attack.

**Your data**
We’ve reviewed our systems and found no evidence that SparkLayer or your data was affected at any point.

**What you need to do**
Nothing. B2B pricing, quick order and checkout are all working again. If your buyers had items in their cart, these have been kept. If you took orders manually through Shopify while we were offline, those are unaffected.

**What happens next**
We’ll send you a short written summary of what happened and the changes we’re making so that an issue like this doesn’t take SparkLayer offline again.

We’re sorry for the disruption, and especially for telling you we were back before we were. Thank you for bearing with us. If anything doesn’t look right, contact our support team at [support@sparklayer.io](mailto:support@sparklayer.io) and we’ll prioritise it.

## 2026-10-22 09:09 · Update
Our engineering team has made good progress overnight. We’re migrating SparkLayer to updated infrastructure with the security fix in place, and we expect to be back online before 12pm UK time. If we’re back sooner, we’ll post here straight away.

We’re testing everything, including checkout, quick order and pricing, before we switch services back on, so you can rely on SparkLayer as soon as it’s live.

**Your data**
We’ve found no evidence that SparkLayer or your data has been affected at any point.

**In the meantime**
You can still take orders through Shopify. In your Shopify admin, go to **Orders → Create order**, add the products and apply your B2B prices, then use **Send invoice**. Our support team is available at [support@sparklayer.io](mailto:support@sparklayer.io) to help.

Thank you for your patience. We know this has been a long wait.

## 2026-10-22 06:53 · Identified
SparkLayer is still offline. Our hosting provider’s automatic security update still hasn’t been applied to our platform, so we’ve stopped waiting for it. Our engineering team is now moving SparkLayer onto infrastructure where we install the patched version of PHP ourselves and verify it before anything goes live. We won’t bring services back until that check is complete.

**Why we’re still offline**
This vulnerability affects a large part of the internet. National cyber security agencies, including the UK’s NCSC, have advised any organisation that can’t fully patch to keep its systems offline, and many organisations have done the same. We’ve found no evidence that SparkLayer or your data has been affected, and we’re not willing to put that at risk.

**Next update**
By 12pm UK time, or sooner if we’re back online.

We know this has been a long and frustrating outage, especially for customers in Australia and New Zealand, where it’s covered a full trading day. We’re sorry. Once we’re back online, we’ll be in touch about how we make this right.

## 2026-10-22 02:27 · Identified
SparkLayer is still offline while we complete the security fix. We won’t bring services back until our own engineering team has verified the fix is fully in place and tested. We know that means a longer wait, but we want to be absolutely sure the patch is in place.

**Next update:** by 7am UK time, or sooner if we’re back online before then.
