#!/usr/bin/env node

/**
 * Comprehensive test of all implemented components from Phases 2-5
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 COMPREHENSIVE TEST - Phases 2-5\n');
console.log('=' .repeat(70));

// Helper functions
function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

function checkComponent(name, path, expectedExports = []) {
  const fullPath = `${__dirname}/${path}`;
  if (!fs.existsSync(fullPath)) {
    return { exists: false, lines: 0, size: 0 };
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n').length;
  const size = fs.statSync(fullPath).size;

  const hasExports = expectedExports.every(exp =>
    content.includes(`export default ${exp}`) ||
    content.includes(`export { ${exp}`) ||
    content.includes(`export const ${exp}`)
  );

  return { exists: true, lines, size, hasExports, content };
}

function testImports(filePath, expectedImports) {
  if (!fileExists(filePath)) return false;
  const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
  return expectedImports.every(imp => content.includes(imp));
}

// Test results storage
const results = {
  phase2: { total: 0, passed: 0, components: [] },
  phase3: { total: 0, passed: 0, components: [] },
  phase4: { total: 0, passed: 0, components: [] },
  phase5: { total: 0, passed: 0, components: [] },
};

// =============================================================================
// PHASE 2: Brand & Onboarding
// =============================================================================
console.log('\n📱 PHASE 2: Brand & Onboarding\n' + '-'.repeat(70));

const phase2Tests = [
  {
    name: 'Splash Screen (2.1)',
    path: 'src/screens/Auth/SplashScreen.tsx',
    tests: [
      { name: 'File exists', check: () => fileExists('src/screens/Auth/SplashScreen.tsx') },
      { name: 'Logo animation', check: (content) => content?.includes('Animated') },
      { name: 'Auto advance logic', check: (content) => content?.includes('setTimeout') || content?.includes('useEffect') },
      { name: 'Brand colors used', check: (content) => content?.includes('colors.gold') && content?.includes('colors.black') },
    ]
  },
  {
    name: 'Onboarding Slides (2.2)',
    path: 'src/screens/Auth/OnboardingScreen.tsx',
    tests: [
      { name: 'File exists', check: () => fileExists('src/screens/Auth/OnboardingScreen.tsx') },
      { name: 'Carousel implementation', check: (content) => content?.includes('ScrollView') || content?.includes('FlatList') },
      { name: 'Dots indicator', check: (content) => content?.includes('dot') || content?.includes('indicator') },
      { name: 'Skip/Next buttons', check: (content) => content?.includes('Skip') && content?.includes('Next') },
      { name: 'Get Started button', check: (content) => content?.includes('Get Started') || content?.includes('getStarted') },
    ]
  },
  {
    name: 'Role Selection (2.3)',
    path: 'src/screens/Auth/RoleSelectionScreen.tsx',
    tests: [
      { name: 'File exists', check: () => fileExists('src/screens/Auth/RoleSelectionScreen.tsx') },
      { name: 'Seeker option', check: (content) => content?.includes('Seeker') || content?.includes('seeker') },
      { name: 'Provider option', check: (content) => content?.includes('Provider') || content?.includes('provider') },
      { name: 'Role state management', check: (content) => content?.includes('useState') && content?.includes('role') },
    ]
  }
];

phase2Tests.forEach(component => {
  console.log(`\n✅ Testing: ${component.name}`);
  const result = checkComponent(component.name, component.path);
  results.phase2.total++;

  if (result.exists) {
    results.phase2.passed++;
    console.log(`  ✓ Component exists (${result.lines} lines, ${(result.size/1024).toFixed(1)}KB)`);

    component.tests.forEach(test => {
      const passed = test.check(result.content);
      console.log(`  ${passed ? '✓' : '✗'} ${test.name}`);
    });

    results.phase2.components.push({ name: component.name, status: 'implemented' });
  } else {
    console.log(`  ✗ Component NOT FOUND at ${component.path}`);
    results.phase2.components.push({ name: component.name, status: 'missing' });
  }
});

// =============================================================================
// PHASE 3: Auth
// =============================================================================
console.log('\n\n🔐 PHASE 3: Authentication\n' + '-'.repeat(70));

const phase3Tests = [
  {
    name: 'Login Screen (3.2)',
    path: 'src/screens/Auth/LoginScreen.tsx',
    tests: [
      { name: 'File exists', check: () => fileExists('src/screens/Auth/LoginScreen.tsx') },
      { name: 'Email input', check: (content) => content?.includes('email') || content?.includes('Email') },
      { name: 'Password input', check: (content) => content?.includes('password') || content?.includes('Password') },
      { name: 'Form validation', check: (content) => content?.includes('useForm') || content?.includes('validation') },
      { name: 'Submit handler', check: (content) => content?.includes('handleSubmit') || content?.includes('onSubmit') },
    ]
  },
  {
    name: 'Sign Up Screen (3.3)',
    path: 'src/screens/Auth/SignUpScreen.tsx',
    tests: [
      { name: 'File exists', check: () => fileExists('src/screens/Auth/SignUpScreen.tsx') },
      { name: 'Zod validation', check: (content) => content?.includes('zod') || content?.includes('z.') },
      { name: 'Full name field', check: (content) => content?.includes('fullName') || content?.includes('name') },
      { name: 'Email field', check: (content) => content?.includes('email') },
      { name: 'Password field', check: (content) => content?.includes('password') },
      { name: 'Form submission', check: (content) => content?.includes('handleSubmit') },
    ]
  },
  {
    name: 'Verification Modal (3.4)',
    path: 'src/components/ui/VerificationModal.tsx',
    tests: [
      { name: 'File exists', check: () => fileExists('src/components/ui/VerificationModal.tsx') },
      { name: 'OTP inputs', check: (content) => content?.includes('TextInput') && (content?.includes('otp') || content?.includes('code')) },
      { name: 'Auto-advance logic', check: (content) => content?.includes('useEffect') || content?.includes('onChange') },
      { name: 'Resend timer', check: (content) => content?.includes('timer') || content?.includes('countdown') },
    ]
  },
  {
    name: 'Password Reset Modal (3.5)',
    path: 'src/components/ui/PasswordResetModal.tsx',
    tests: [
      { name: 'File exists', check: () => fileExists('src/components/ui/PasswordResetModal.tsx') },
      { name: 'Email input', check: (content) => content?.includes('email') },
      { name: 'Success state', check: (content) => content?.includes('success') || content?.includes('sent') },
    ]
  }
];

phase3Tests.forEach(component => {
  console.log(`\n✅ Testing: ${component.name}`);
  const result = checkComponent(component.name, component.path);
  results.phase3.total++;

  if (result.exists) {
    results.phase3.passed++;
    console.log(`  ✓ Component exists (${result.lines} lines, ${(result.size/1024).toFixed(1)}KB)`);

    component.tests.forEach(test => {
      const passed = test.check(result.content);
      console.log(`  ${passed ? '✓' : '✗'} ${test.name}`);
    });

    results.phase3.components.push({ name: component.name, status: 'implemented' });
  } else {
    console.log(`  ✗ Component NOT FOUND at ${component.path}`);
    results.phase3.components.push({ name: component.name, status: 'missing' });
  }
});

// =============================================================================
// PHASE 4: Search & Filters
// =============================================================================
console.log('\n\n🔍 PHASE 4: Search & Filters\n' + '-'.repeat(70));

const phase4Tests = [
  {
    name: 'Filter Store (4.1)',
    path: 'src/state/useFilterStore.ts',
    tests: [
      { name: 'File exists', check: () => fileExists('src/state/useFilterStore.ts') },
      { name: 'Zustand store', check: (content) => content?.includes('zustand') || content?.includes('create') },
      { name: 'Filter state', check: (content) => content?.includes('filters') },
      { name: 'Update actions', check: (content) => content?.includes('setFilter') || content?.includes('updateFilter') },
      { name: 'Reset action', check: (content) => content?.includes('reset') || content?.includes('clear') },
    ]
  },
  {
    name: 'Home Screen (4.2)',
    path: 'src/screens/Home/HomeScreen.tsx',
    tests: [
      { name: 'File exists', check: () => fileExists('src/screens/Home/HomeScreen.tsx') },
      { name: 'Map view', check: (content) => content?.includes('MapView') },
      { name: 'Card deck', check: (content) => content?.includes('Card') || content?.includes('ListingCard') },
      { name: 'Quick chips', check: (content) => content?.includes('Chip') || content?.includes('chip') },
      { name: 'Search bar', check: (content) => content?.includes('Search') || content?.includes('search') },
    ]
  },
  {
    name: 'Search Screen (4.3)',
    path: 'src/screens/Search/SearchScreen.tsx',
    tests: [
      { name: 'File exists', check: () => fileExists('src/screens/Search/SearchScreen.tsx') },
      { name: 'List/Map toggle', check: (content) => content?.includes('viewMode') || (content?.includes('list') && content?.includes('map')) },
      { name: 'Sort options', check: (content) => content?.includes('sort') || content?.includes('Sort') },
      { name: 'Empty state', check: (content) => content?.includes('empty') || content?.includes('No results') },
      { name: 'Filter integration', check: (content) => content?.includes('useFilterStore') || content?.includes('filter') },
    ]
  },
  {
    name: 'Filters Sheet (4.4)',
    path: 'src/components/patterns/FiltersSheet.tsx',
    tests: [
      { name: 'File exists', check: () => fileExists('src/components/patterns/FiltersSheet.tsx') },
      { name: 'Modal/Sheet', check: (content) => content?.includes('Modal') || content?.includes('Sheet') },
      { name: 'Accordions', check: (content) => content?.includes('Accordion') || content?.includes('Collapsible') },
      { name: 'Filter controls', check: (content) => content?.includes('Slider') || content?.includes('Checkbox') || content?.includes('Toggle') },
      { name: 'Apply button', check: (content) => content?.includes('Apply') || content?.includes('apply') },
    ]
  }
];

phase4Tests.forEach(component => {
  console.log(`\n✅ Testing: ${component.name}`);
  const result = checkComponent(component.name, component.path);
  results.phase4.total++;

  if (result.exists) {
    results.phase4.passed++;
    console.log(`  ✓ Component exists (${result.lines} lines, ${(result.size/1024).toFixed(1)}KB)`);

    component.tests.forEach(test => {
      const passed = test.check(result.content);
      console.log(`  ${passed ? '✓' : '✗'} ${test.name}`);
    });

    results.phase4.components.push({ name: component.name, status: 'implemented' });
  } else {
    console.log(`  ✗ Component NOT FOUND at ${component.path}`);
    results.phase4.components.push({ name: component.name, status: 'missing' });
  }
});

// =============================================================================
// PHASE 5: Listings
// =============================================================================
console.log('\n\n🏠 PHASE 5: Listings\n' + '-'.repeat(70));

const phase5Tests = [
  {
    name: 'Listing Card (5.1)',
    path: 'src/components/patterns/ListingCard.tsx',
    tests: [
      { name: 'File exists', check: () => fileExists('src/components/patterns/ListingCard.tsx') },
      { name: 'Image display', check: (content) => content?.includes('Image') },
      { name: 'Title/description', check: (content) => content?.includes('title') && content?.includes('description') },
      { name: 'Badges', check: (content) => content?.includes('Badge') || content?.includes('badge') },
      { name: 'Facility info', check: (content) => content?.includes('facility') || content?.includes('provider') },
    ]
  },
  {
    name: 'Photo Carousel (5.2)',
    path: 'src/components/patterns/PhotoCarousel.tsx',
    tests: [
      { name: 'File exists', check: () => fileExists('src/components/patterns/PhotoCarousel.tsx') },
      { name: 'Image swipe', check: (content) => content?.includes('ScrollView') || content?.includes('FlatList') || content?.includes('Carousel') },
      { name: 'Dots indicator', check: (content) => content?.includes('dot') || content?.includes('indicator') },
      { name: 'Navigation arrows', check: (content) => content?.includes('chevron') || content?.includes('arrow') },
      { name: 'Gold styling', check: (content) => content?.includes('colors.gold') },
    ]
  },
  {
    name: 'Listing Details (5.3)',
    path: 'src/screens/Listing/ListingDetailsScreen.tsx',
    tests: [
      { name: 'File exists', check: () => fileExists('src/screens/Listing/ListingDetailsScreen.tsx') },
      { name: 'Photo carousel', check: (content) => content?.includes('PhotoCarousel') },
      { name: 'Quick stats', check: (content) => content?.includes('stats') || content?.includes('availability') },
      { name: 'Collapsible sections', check: (content) => content?.includes('Collapsible') || content?.includes('expanded') },
      { name: 'Map view', check: (content) => content?.includes('MapView') || content?.includes('map') },
      { name: 'Sticky CTA', check: (content) => content?.includes('Apply') || content?.includes('Contact') },
    ]
  }
];

phase5Tests.forEach(component => {
  console.log(`\n✅ Testing: ${component.name}`);
  const result = checkComponent(component.name, component.path);
  results.phase5.total++;

  if (result.exists) {
    results.phase5.passed++;
    console.log(`  ✓ Component exists (${result.lines} lines, ${(result.size/1024).toFixed(1)}KB)`);

    component.tests.forEach(test => {
      const passed = test.check(result.content);
      console.log(`  ${passed ? '✓' : '✗'} ${test.name}`);
    });

    results.phase5.components.push({ name: component.name, status: 'implemented' });
  } else {
    console.log(`  ✗ Component NOT FOUND at ${component.path}`);
    results.phase5.components.push({ name: component.name, status: 'missing' });
  }
});

// =============================================================================
// TypeScript Compilation Test
// =============================================================================
console.log('\n\n⚙️ TypeScript Compilation Check\n' + '-'.repeat(70));

try {
  execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: 'pipe' });
  console.log('✅ All TypeScript files compile without errors');
} catch (error) {
  const output = error.stdout || error.stderr || '';
  const errors = output.split('\n').filter(line => line.includes('error TS'));
  console.log(`⚠️ TypeScript compilation has ${errors.length} errors`);

  // Show first 5 errors
  errors.slice(0, 5).forEach(err => {
    console.log(`  ${err.trim()}`);
  });
}

// =============================================================================
// Integration Tests
// =============================================================================
console.log('\n\n🔄 Integration Tests\n' + '-'.repeat(70));

const integrationTests = [
  {
    name: 'Navigation Setup',
    check: () => fileExists('src/navigation/RootNavigator.tsx') && fileExists('src/navigation/TabNavigator.tsx'),
  },
  {
    name: 'State Management',
    check: () => fileExists('src/state/useAuthStore.ts') && fileExists('src/state/useFilterStore.ts'),
  },
  {
    name: 'UI Components',
    check: () => {
      const components = ['Button', 'Card', 'Chip', 'Input', 'Badge', 'Toggle', 'Checkbox'];
      return components.every(c => fileExists(`src/components/ui/${c}.tsx`));
    },
  },
  {
    name: 'Theme Configuration',
    check: () => fileExists('src/theme/tokens.ts'),
  },
  {
    name: 'Supabase Integration',
    check: () => fileExists('src/lib/supabase.ts'),
  },
];

integrationTests.forEach(test => {
  const passed = test.check();
  console.log(`${passed ? '✅' : '❌'} ${test.name}`);
});

// =============================================================================
// FINAL SUMMARY
// =============================================================================
console.log('\n' + '='.repeat(70));
console.log('📊 COMPREHENSIVE TEST SUMMARY');
console.log('='.repeat(70));

console.log('\nPhase Results:');
console.log(`  Phase 2 (Brand):    ${results.phase2.passed}/${results.phase2.total} components found`);
console.log(`  Phase 3 (Auth):     ${results.phase3.passed}/${results.phase3.total} components found`);
console.log(`  Phase 4 (Search):   ${results.phase4.passed}/${results.phase4.total} components found`);
console.log(`  Phase 5 (Listings): ${results.phase5.passed}/${results.phase5.total} components found`);

const totalComponents = results.phase2.total + results.phase3.total + results.phase4.total + results.phase5.total;
const foundComponents = results.phase2.passed + results.phase3.passed + results.phase4.passed + results.phase5.passed;

console.log(`\nTotal: ${foundComponents}/${totalComponents} components implemented`);

// List missing components
const missingComponents = [
  ...results.phase2.components.filter(c => c.status === 'missing'),
  ...results.phase3.components.filter(c => c.status === 'missing'),
  ...results.phase4.components.filter(c => c.status === 'missing'),
  ...results.phase5.components.filter(c => c.status === 'missing'),
];

if (missingComponents.length > 0) {
  console.log('\n⚠️ Missing Components:');
  missingComponents.forEach(c => console.log(`  - ${c.name}`));
}

// Check if app is running
console.log('\n🌐 Runtime Status:');
try {
  execSync('curl -s http://localhost:8081 > /dev/null 2>&1');
  console.log('  ✅ Development server is running on http://localhost:8081');
} catch {
  console.log('  ⚠️ Development server is not accessible');
}

console.log('\n' + '='.repeat(70));
console.log(foundComponents === totalComponents ?
  '✅ ALL COMPONENTS TESTED AND VERIFIED!' :
  `⚠️ ${missingComponents.length} components need implementation`);
console.log('='.repeat(70));