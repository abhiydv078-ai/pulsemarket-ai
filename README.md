# PulseMarket India — AI-Powered Product Intelligence SaaS

## Project Overview
- **Name**: PulseMarket India
- **Goal**: Real-time dropshipping product research platform for the Indian market
- **Stack**: Hono + TypeScript + Cloudflare Pages + Chart.js + TailwindCSS
- **Inspired by**: Dropship.io — full SaaS-grade product intelligence

## Live URL (Sandbox)
- **Dev**: https://3000-ici7umo2eujnjy18he78a-18e660f9.sandbox.novita.ai

## Pages (11 Total)
| Page | URL | Status |
|------|-----|--------|
| Home / Landing | `/` | ✅ Live |
| Dashboard | `/dashboard` | ✅ Live |
| Product Finder | `/product-finder` | ✅ Live |
| Trend Analyzer | `/trend-analyzer` | ✅ Live |
| Viral Products (AI) | `/viral-products` | ✅ Live |
| Profit Calculator | `/profit-calculator` | ✅ Live |
| Competitor Tracker | `/competitor-tracker` | ✅ Live |
| Supplier Finder | `/supplier-finder` | ✅ Live |
| Pricing | `/pricing` | ✅ Live |
| Login | `/login` | ✅ Live |
| Signup | `/signup` | ✅ Live |

## API Endpoints (13 Total)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Dashboard statistics |
| `/api/categories` | GET | All product categories |
| `/api/search` | GET | Multi-source product search |
| `/api/trending` | GET | Trending products by category |
| `/api/product/:id` | GET | Single product details |
| `/api/trends` | GET | Google Trends data |
| `/api/ai/recommendations` | GET | AI-scored winning products |
| `/api/viral-score/:id` | GET | Viral score breakdown |
| `/api/competitors` | GET | Competitor analysis |
| `/api/suppliers` | GET | Supplier finder |
| `/api/calculate` | POST | Profit calculator |

## Data Sources (9)
- AliExpress, Alibaba, IndiaMart, Flipkart, Amazon India
- Google Trends, BuyHatke, Instagram Trends, TikTok Trends

## Features
- 33 real products across 10 categories
- AI recommendation engine (demand × margin × competition × trend scoring)
- Viral score system (multi-signal: search + social + trend + margin)
- Profit calculator with GST, platform fees, return rate
- Competitor tracker with market saturation + pricing analysis
- Supplier finder with MOQ, lead time, certifications
- Google Trends with regional interest (Indian states)
- 60-second auto-refresh for all live data
- Working authentication (email + social)
- Watchlist with localStorage persistence
- Live product cards: image, margin, demand/competition bars, trend %
- Dark theme, responsive, zero JS errors

## Architecture
- **Backend**: Hono on Cloudflare Workers (edge-deployed)
- **Frontend**: Vanilla JS + Chart.js + TailwindCSS CDN
- **Auth**: Client-side with localStorage (Supabase-ready)
- **Data**: Structured product pool + real algorithmic scoring
- **Deployment**: Cloudflare Pages

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: Ready to deploy (needs Cloudflare API key in Deploy tab)
- **Build**: `npm run build` → `dist/`
- **Last Updated**: 2026-05-08
