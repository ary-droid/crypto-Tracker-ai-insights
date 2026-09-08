# AI-Powered Crypto Tracker

A cryptocurrency tracking and portfolio management web application built with Next.js and TypeScript. The application combines cryptocurrency market data with Google Gemini-powered features to provide portfolio assistance, AI-generated insights, and natural-language crypto queries.

## 1. Project Overview

The AI-Powered Crypto Tracker allows users to explore cryptocurrency market information, manage their portfolio holdings, view portfolio allocation, and interact with AI features.

The project combines traditional application logic with a Large Language Model (LLM):

- Cryptocurrency market data is used as application input.
- Portfolio values and allocations are calculated by the application.
- Google Gemini is used to understand user queries and generate natural-language insights.
- Next.js API routes act as the server-side layer between the frontend and AI services.

## 2. Features

- Cryptocurrency market tracking
- Cryptocurrency search and exploration
- Portfolio/holdings management
- Portfolio value and allocation calculations
- Interactive market/portfolio visualizations
- AI-powered portfolio chat
- AI-generated portfolio insights
- Natural-language cryptocurrency queries
- Portfolio rebalancing calculations
- Responsive web interface

## 3. AI/LLM Features

### AI Portfolio Chat

Users can ask questions about their portfolio in natural language.

Example:

> "Is my portfolio diversified?"

The application provides Gemini with the user's question and relevant portfolio context. Gemini then generates a conversational response.

### AI Portfolio Insights

The application sends relevant portfolio information to Gemini and asks the LLM to generate a concise, human-readable analysis.

The application performs portfolio calculations first, such as asset values and allocation percentages. Gemini is then used to interpret that information and produce an explanation.

### Natural-Language Crypto Queries

Users can describe a desired crypto filter using natural language.

Example:

> "Show me coins that gained more than 10%."

Gemini interprets the request and converts it into structured information that the application can use to filter cryptocurrency data.

The actual filtering is performed by the application's normal programming logic.

### Gemini Integration Flow
User Input / Portfolio Data
            ↓
      Next.js API Route
            ↓
     Prompt + Context
            ↓
       Gemini LLM
            ↓
    Generated Response
            ↓
          Frontend
