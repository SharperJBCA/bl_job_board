---
layout: default
title: Completed & Ended Jobs
nav: completed
---

# Completed & Ended Jobs

Closed contracts. Some succeeded. Some… *stopped being possible.*

{% assign complete = site.jobs | where: "status", "complete" %}
{% assign ended    = site.jobs | where: "status", "ended" %}
{% assign closed   = complete | concat: ended %}

{% assign closed_sorted = closed | sort: "closed_date" | reverse %}

{% for job in closed_sorted %}
## [{{ job.title }}]({{ job.url | relative_url }})

**Status:** {{ job.status }}  
**Closed:** {% if job.closed_date %}{{ job.closed_date }}{% else %}—{% endif %}  
**Tags:** {{ job.tags | join: ", " }}  
**Location:** {% if job.location_slug %}[{{ job.location }}]({{ "/locations/" | append: job.location_slug | append: "/" | relative_url }}){% else %}{{ job.location }}{% endif %}  
**Final Team:** {% if job.volunteers %}{{ job.volunteers | join: ", " }}{% else %}—{% endif %}

{{ job.excerpt }}

---
{% endfor %}