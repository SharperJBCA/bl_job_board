---
layout: default
title: World Map
nav: map
permalink: /map/
---

# World Map

![World Map](/bl_job_board/assets/system_map.svg)

## Locations
<ul>
{% for loc in site.locations %}
  <li><a href="{{ loc.url | relative_url }}">{{ loc.title }}</a></li>
{% endfor %}
</ul>
