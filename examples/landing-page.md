# Example: Building a Landing Page with UI Forge

This example shows how to build a complete landing page using components from UI Forge.

## User Request

"I need to build a modern landing page for my SaaS product that converts visitors into customers."

## Claude Response (with UI Forge)

I'll help you build a high-converting landing page using components from UI Forge! Let me set up a complete landing page with:

### 1. Hero Section with Gradient Background

First, let's add a stunning hero section:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 opacity-20" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
          Build Faster with AI
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
          The modern SaaS platform that helps teams ship products 10x faster
        </p>
        
        <div className="flex gap-4 justify-center">
          <Button size="lg" className="group">
            Start Free Trial
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition" />
          </Button>
          <Button size="lg" variant="outline">
            Watch Demo
          </Button>
        </div>
      </div>
    </section>
  );
}
```

### 2. Features Section with Icon Cards

```tsx
import { Zap, Shield, Sparkles } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Built for speed with cutting-edge technology"
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description: "Enterprise-grade security out of the box"
  },
  {
    icon: Sparkles,
    title: "AI-Powered",
    description: "Smart automation that learns from your workflow"
  }
];

export default function Features() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center mb-12">
          Everything you need to succeed
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
              <feature.icon className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

### 3. Pricing Section

```tsx
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    price: "$29",
    features: ["Up to 5 users", "Basic features", "Email support"]
  },
  {
    name: "Pro",
    price: "$99",
    popular: true,
    features: ["Up to 20 users", "Advanced features", "Priority support", "Custom integrations"]
  },
  {
    name: "Enterprise",
    price: "Custom",
    features: ["Unlimited users", "All features", "24/7 support", "Dedicated account manager"]
  }
];

export default function Pricing() {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center mb-12">
          Simple, transparent pricing
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`p-8 rounded-2xl border-2 ${
                plan.popular 
                  ? 'border-purple-600 shadow-2xl scale-105' 
                  : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              )}
              
              <h3 className="text-2xl font-bold mt-4">{plan.name}</h3>
              <div className="mt-4 mb-6">
                <span className="text-5xl font-bold">{plan.price}</span>
                {plan.price !== "Custom" && <span className="text-gray-600">/month</span>}
              </div>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full" 
                variant={plan.popular ? "default" : "outline"}
              >
                Get Started
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

### 4. Testimonials Carousel

```tsx
"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    quote: "This product transformed how our team works. We're 10x more productive!",
    author: "Sarah Johnson",
    role: "CEO at TechCorp"
  },
  {
    quote: "The best investment we've made this year. Highly recommended!",
    author: "Mike Chen",
    role: "CTO at StartupXYZ"
  }
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center mb-12">
          Loved by thousands
        </h2>
        
        <div className="relative bg-white p-12 rounded-2xl shadow-xl">
          <p className="text-2xl text-gray-700 mb-6">
            "{testimonials[current].quote}"
          </p>
          <div>
            <p className="font-semibold">{testimonials[current].author}</p>
            <p className="text-gray-600">{testimonials[current].role}</p>
          </div>
          
          <div className="flex gap-2 mt-6">
            <button 
              onClick={() => setCurrent((current - 1 + testimonials.length) % testimonials.length)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <ChevronLeft />
            </button>
            <button 
              onClick={() => setCurrent((current + 1) % testimonials.length)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
```

### 5. Call-to-Action Section

```tsx
import { Button } from "@/components/ui/button";

export default function CTA() {
  return (
    <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Ready to get started?
        </h2>
        <p className="text-xl mb-8 opacity-90">
          Join thousands of teams already using our platform
        </p>
        <Button size="lg" variant="secondary">
          Start Your Free Trial
        </Button>
      </div>
    </section>
  );
}
```

### Complete Page Structure

```tsx
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <Features />
      <Pricing />
      <Testimonials />
      <CTA />
    </main>
  );
}
```

## Dependencies

```bash
npm install lucide-react
```

All components use Tailwind CSS. Make sure your `tailwind.config.js` includes:

```js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
}
```

## Result

A complete, modern landing page with:
- ✅ Eye-catching hero section
- ✅ Feature showcase
- ✅ Pricing comparison
- ✅ Social proof (testimonials)
- ✅ Strong call-to-action
- ✅ Fully responsive
- ✅ Production-ready code

This entire page was built in minutes using UI Forge components!
