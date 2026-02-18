> PROSPERO STATION // CONTRACTS TERMINAL  
> ACCESS: PUBLIC // LOGGED: ANON  
> LAST SYNC: {{ site.time | date: "%Y-%m-%d %H:%M UTC" }}
---
layout: home
title: Job Board
nav: jobs
---

# Job Board

Open contracts posted to the board. Ping the Warden to volunteer, or add your name to the volunteers list.

{% assign open_jobs = site.jobs | where: "status", "open" | sort: "danger" %}

{% for job in open_jobs %}
## [{{ job.title }}]({{ job.url | relative_url }})

**Tags:** {{ job.tags | join: ", " }}  
**Location:** {% if job.location %}[{{ job.location }}]({{ "/locations/" | append: job.location_slug | append: "/" | relative_url }}){% endif %}  
**Danger:** {{ job.danger }} / 5  
**Pay:** {{ job.pay }}  
**Volunteers:** {% if job.volunteers %}{{ job.volunteers | join: ", " }}{% else %}—{% endif %}

{{ job.excerpt }}

---
{% endfor %}