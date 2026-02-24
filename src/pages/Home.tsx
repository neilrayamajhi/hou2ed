import { Hero } from '../components/sections/Hero';
import { Mission } from '../components/sections/Mission';
import { WhatItDoes } from '../components/sections/WhatItDoes';
import { Waitlist } from '../components/sections/Waitlist';
import { Footer } from '../components/sections/Footer';

export function Home() {
  return (
    <>
      <Hero />
      <Mission />
      <WhatItDoes />
      <Waitlist />
      <Footer />
    </>
  );
}
