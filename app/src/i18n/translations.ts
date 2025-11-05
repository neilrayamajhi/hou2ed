// Translation files as TypeScript modules to avoid JSON import issues
export const en = {
  common: {
    welcome: "Welcome",
    loading: "Loading...",
    error: "Error",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    search: "Search",
    filter: "Filter",
    apply: "Apply",
    clear: "Clear",
    yes: "Yes",
    no: "No",
    ok: "OK",
    next: "Next",
    back: "Back",
    skip: "Skip",
    getStarted: "Get Started",
    signIn: "Sign In",
    signOut: "Sign Out",
    signUp: "Sign Up"
  },
  navigation: {
    home: "Home",
    search: "Search",
    messages: "Messages",
    saved: "Saved",
    profile: "Profile"
  },
  onboarding: {
    splash: {
      tagline: "Housing to End Disparity"
    },
    slides: {
      togetherness: {
        title: "Togetherness",
        description: "HOU2ED brings communities together to ensure everyone has a safe place to call home. No one should face housing challenges alone."
      },
      secondChances: {
        title: "Second Chances",
        description: "Everyone deserves an opportunity to rebuild. We connect those in need with housing providers who believe in fresh starts."
      },
      noOneStandsAlone: {
        title: "No One Stands Alone",
        description: "Our network of support ensures you have advocates, resources, and a community standing with you every step of the way."
      }
    }
  },
  auth: {
    roleSelection: {
      title: "I am a...",
      seeker: "Housing Seeker",
      seekerDesc: "Looking for safe, affordable housing",
      provider: "Housing Provider",
      providerDesc: "Offering housing opportunities"
    },
    login: {
      title: "Welcome Back",
      email: "Email",
      password: "Password",
      forgotPassword: "Forgot password?",
      noAccount: "Don't have an account?",
      errors: {
        invalidEmail: "Please enter a valid email",
        passwordRequired: "Password is required"
      }
    },
    signUp: {
      title: "Create Account",
      fullName: "Full Name",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm Password",
      phone: "Phone Number (optional)",
      termsAgree: "I agree to the Terms of Service and Privacy Policy",
      hasAccount: "Already have an account?",
      errors: {
        nameRequired: "Full name is required",
        emailInvalid: "Please enter a valid email",
        passwordMin: "Password must be at least 8 characters",
        passwordMatch: "Passwords do not match",
        termsRequired: "You must agree to the terms"
      }
    }
  },
  home: {
    nearYou: "Near You",
    viewAll: "View All",
    recommended: "Recommended",
    recentlyAdded: "Recently Added",
    unitsAvailable: "{{count}} units available"
  },
  search: {
    title: "Search",
    placeholder: "Search by location or property",
    filters: {
      title: "Filters",
      priceRange: "Price Range",
      bedrooms: "Bedrooms",
      propertyType: "Property Type",
      neighborhoods: "Neighborhoods",
      monthlyIncome: "Monthly Income",
      acceptsVouchers: "Accepts Vouchers",
      immediateAvailability: "Immediate Availability",
      applyFilters: "Apply Filters",
      clearAll: "Clear All"
    },
    results: {
      showing: "Showing {{count}} results",
      noResults: "No results found",
      tryAdjusting: "Try adjusting your filters"
    }
  },
  listing: {
    details: {
      rent: "${{amount}}/mo",
      beds: "{{count}} bed",
      baths: "{{count}} bath",
      sqft: "{{count}} ft²",
      available: "Available",
      notAvailable: "Not Available",
      apply: "Apply Now",
      save: "Save",
      saved: "Saved",
      share: "Share"
    },
    sections: {
      overview: "Overview",
      amenities: "Amenities",
      eligibility: "Eligibility",
      location: "Location",
      contact: "Contact"
    }
  },
  messages: {
    inbox: {
      title: "Messages",
      empty: "No Messages Yet",
      emptyDesc: "Your conversations with housing providers will appear here"
    },
    thread: {
      typeMessage: "Type a message...",
      send: "Send",
      attachment: "Add attachment",
      reportAbuse: "Report Abuse",
      reportModal: {
        title: "Report Abuse",
        subtitle: "Please describe the issue you're experiencing",
        placeholder: "Describe the inappropriate behavior...",
        submit: "Submit Report"
      }
    }
  },
  saved: {
    title: "Saved Listings",
    count: "{{count}} listing{{plural}} saved",
    empty: "No Saved Listings",
    emptyDesc: "Listings you save will appear here for easy access",
    browse: "Browse Listings",
    remove: "Remove from Saved?",
    removeConfirm: "Remove \"{{title}}\" from your saved listings?"
  },
  profile: {
    title: "Profile",
    housingSeeker: "Housing Seeker",
    housingProvider: "Housing Provider",
    sections: {
      applications: "My Applications",
      savedSearches: "Saved Searches",
      accountSettings: "Account Settings"
    },
    settings: {
      changePassword: "Change Password",
      notifications: "Notifications",
      pushNotifications: "Push Notifications",
      emailNotifications: "Email Notifications",
      language: "Language",
      deleteAccount: "Delete Account",
      deleteConfirm: "Are you sure you want to delete your account? This action cannot be undone."
    },
    changePassword: {
      title: "Change Password",
      current: "Current Password",
      new: "New Password",
      confirm: "Confirm New Password",
      submit: "Change Password"
    }
  },
  provider: {
    availability: {
      title: "Update Availability",
      yourProperties: "Your Properties",
      availableBeds: "Available beds",
      ofTotal: "of {{total}} total",
      updated: "Updated {{time}}",
      saveAll: "Save All",
      saving: "Saving...",
      noChanges: "No Changes",
      noChangesDesc: "No updates to save",
      stale: {
        banner: "Data may be stale",
        description: "Some properties haven't been updated in over 48 hours",
        confirmNoChange: "Confirm no change"
      },
      tip: "Quick tip: Update availability daily to help seekers find housing"
    }
  },
  application: {
    wizard: {
      title: "Apply for Housing",
      steps: {
        info: "Contact Info",
        eligibility: "Eligibility",
        documents: "Documents",
        review: "Review"
      },
      next: "Next",
      back: "Back",
      submit: "Submit Application"
    },
    success: {
      title: "Application Submitted!",
      message: "Your application has been sent to the housing provider. You'll receive a confirmation email shortly.",
      reference: "Reference Number: {{number}}"
    }
  }
};

// Spanish translations - complete structure with fallback to English where not yet translated
export const es = {
  common: {
    welcome: "Bienvenido",
    loading: "Cargando...",
    error: "Error",
    cancel: "Cancelar",
    save: "Guardar",
    delete: "Eliminar",
    edit: "Editar",
    search: "Buscar",
    filter: "Filtrar",
    apply: "Aplicar",
    clear: "Limpiar",
    yes: "Sí",
    no: "No",
    ok: "OK",
    next: "Siguiente",
    back: "Atrás",
    skip: "Omitir",
    getStarted: "Comenzar",
    signIn: "Iniciar Sesión",
    signOut: "Cerrar Sesión",
    signUp: "Registrarse"
  },
  navigation: {
    home: "Inicio",
    search: "Buscar",
    messages: "Mensajes",
    saved: "Guardado",
    profile: "Perfil"
  },
  onboarding: {
    splash: {
      tagline: "Vivienda para Acabar con la Disparidad"
    },
    slides: {
      togetherness: {
        title: "Unión",
        description: "HOU2ED une a las comunidades para asegurar que todos tengan un lugar seguro al que llamar hogar."
      },
      secondChances: {
        title: "Segundas Oportunidades",
        description: "Todos merecen una oportunidad para reconstruir."
      },
      noOneStandsAlone: {
        title: "Nadie Está Solo",
        description: "Nuestra red de apoyo asegura que tengas defensores, recursos y una comunidad a tu lado."
      }
    }
  },
  // These sections are not yet translated - using English as fallback
  auth: {
    roleSelection: {
      title: "I am a...",
      seeker: "Housing Seeker",
      seekerDesc: "Looking for safe, affordable housing",
      provider: "Housing Provider",
      providerDesc: "Offering housing opportunities"
    },
    login: {
      title: "Welcome Back",
      email: "Email",
      password: "Password",
      forgotPassword: "Forgot password?",
      noAccount: "Don't have an account?",
      errors: {
        invalidEmail: "Please enter a valid email",
        passwordRequired: "Password is required"
      }
    },
    signUp: {
      title: "Create Account",
      fullName: "Full Name",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm Password",
      phone: "Phone Number (optional)",
      termsAgree: "I agree to the Terms of Service and Privacy Policy",
      hasAccount: "Already have an account?",
      errors: {
        nameRequired: "Full name is required",
        emailInvalid: "Please enter a valid email",
        passwordMin: "Password must be at least 8 characters",
        passwordMatch: "Passwords do not match",
        termsRequired: "You must agree to the terms"
      }
    }
  },
  home: {
    nearYou: "Near You",
    viewAll: "View All",
    recommended: "Recommended",
    recentlyAdded: "Recently Added",
    unitsAvailable: "{{count}} units available"
  },
  search: {
    title: "Search",
    placeholder: "Search by location or property",
    filters: {
      title: "Filters",
      priceRange: "Price Range",
      bedrooms: "Bedrooms",
      propertyType: "Property Type",
      neighborhoods: "Neighborhoods",
      monthlyIncome: "Monthly Income",
      acceptsVouchers: "Accepts Vouchers",
      immediateAvailability: "Immediate Availability",
      applyFilters: "Apply Filters",
      clearAll: "Clear All"
    },
    results: {
      showing: "Showing {{count}} results",
      noResults: "No results found",
      tryAdjusting: "Try adjusting your filters"
    }
  },
  listing: {
    details: {
      rent: "${{amount}}/mo",
      beds: "{{count}} bed",
      baths: "{{count}} bath",
      sqft: "{{count}} ft²",
      available: "Available",
      notAvailable: "Not Available",
      apply: "Apply Now",
      save: "Save",
      saved: "Saved",
      share: "Share"
    },
    sections: {
      overview: "Overview",
      amenities: "Amenities",
      eligibility: "Eligibility",
      location: "Location",
      contact: "Contact"
    }
  },
  messages: {
    inbox: {
      title: "Messages",
      empty: "No Messages Yet",
      emptyDesc: "Your conversations with housing providers will appear here"
    },
    thread: {
      typeMessage: "Type a message...",
      send: "Send",
      attachment: "Add attachment",
      reportAbuse: "Report Abuse",
      reportModal: {
        title: "Report Abuse",
        subtitle: "Please describe the issue you're experiencing",
        placeholder: "Describe the inappropriate behavior...",
        submit: "Submit Report"
      }
    }
  },
  saved: {
    title: "Saved Listings",
    count: "{{count}} listing{{plural}} saved",
    empty: "No Saved Listings",
    emptyDesc: "Listings you save will appear here for easy access",
    browse: "Browse Listings",
    remove: "Remove from Saved?",
    removeConfirm: "Remove \"{{title}}\" from your saved listings?"
  },
  profile: {
    title: "Profile",
    housingSeeker: "Housing Seeker",
    housingProvider: "Housing Provider",
    sections: {
      applications: "My Applications",
      savedSearches: "Saved Searches",
      accountSettings: "Account Settings"
    },
    settings: {
      changePassword: "Change Password",
      notifications: "Notifications",
      pushNotifications: "Push Notifications",
      emailNotifications: "Email Notifications",
      language: "Language",
      deleteAccount: "Delete Account",
      deleteConfirm: "Are you sure you want to delete your account? This action cannot be undone."
    },
    changePassword: {
      title: "Change Password",
      current: "Current Password",
      new: "New Password",
      confirm: "Confirm New Password",
      submit: "Change Password"
    }
  },
  provider: {
    availability: {
      title: "Update Availability",
      yourProperties: "Your Properties",
      availableBeds: "Available beds",
      ofTotal: "of {{total}} total",
      updated: "Updated {{time}}",
      saveAll: "Save All",
      saving: "Saving...",
      noChanges: "No Changes",
      noChangesDesc: "No updates to save",
      stale: {
        banner: "Data may be stale",
        description: "Some properties haven't been updated in over 48 hours",
        confirmNoChange: "Confirm no change"
      },
      tip: "Quick tip: Update availability daily to help seekers find housing"
    }
  },
  application: {
    wizard: {
      title: "Apply for Housing",
      steps: {
        info: "Contact Info",
        eligibility: "Eligibility",
        documents: "Documents",
        review: "Review"
      },
      next: "Next",
      back: "Back",
      submit: "Submit Application"
    },
    success: {
      title: "Application Submitted!",
      message: "Your application has been sent to the housing provider. You'll receive a confirmation email shortly.",
      reference: "Reference Number: {{number}}"
    }
  }
};