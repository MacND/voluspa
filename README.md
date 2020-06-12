<h1 align="center">Welcome to Voluspa 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.0-blue.svg?cacheSeconds=2592000" />
  <a href="#" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
</p>

## Voluspa, the Guardians' Counterattack
A Discord bot to help arrange Destiny 2 activities.  Automatically converts start times between timezones, keeps fireteam members updated when events are modified, and more.

### Development status
Voluspa is now in closed beta!  I'm testing out the [website](https://voluspa.app) and OAuth login alongside multi-server capability with a few friends' servers.  

### Development plan
OAuth was a major piece of work, but I still have more I want to do:
1) Migrate from MySQL to Postgres, and start storing data using JSONB instead, taking advantage of AWS RDS
2) Break apart the Discord bot from the website.  Undecided on whether we go multi-repo or mono-repo for this
3) Begin building infrastructure in AWS using Terraform; EKS, RDS, and other suitable technologies, and create a proper testing platform
4) Refactor the website to use Bootstrap CSS instead of PureCSS

This is a lot of work and is not necessarily in the order I would want to do it, but it gives you an idea of what I want to achieve here.
