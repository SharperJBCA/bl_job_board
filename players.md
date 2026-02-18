---
layout: default
title: Registered Players
nav: players
permalink: /players/
---

# Registered Players

{% assign players_sorted = site.data.players | sort: "score" | reverse %}

{% for p in players_sorted %}
## {{ p.name }} {% if p.callsign %}// {{ p.callsign }}{% endif %}

**Score:** {{ p.score }} pts  
**Status:** {{ p.status | default: "active" }}  
**Last seen:** {{ p.last_seen | default: "—" }}

**Awards:** {% if p.awards and p.awards.size > 0 %}{{ p.awards | join: ", " }}{% else %}—{% endif %}

**Deaths:**  
{% if p.deaths and p.deaths.size > 0 %}
<ul>
{% for d in p.deaths %}
  <li>{{ d.date }} — <strong>{{ d.type }}</strong>{% if d.location %} ({{ d.location }}){% endif %}</li>
{% endfor %}
</ul>
{% else %}
—  
{% endif %}

---
{% endfor %}
