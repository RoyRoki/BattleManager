# BattleManager - Clean Architecture Guide

## Architecture Overview

This project follows **Clean Architecture** principles with a **feature-based folder structure**. Each feature is self-contained with its own domain, data, and presentation layers.

## Folder Structure Explained

### Features (`src/features/`)

Each feature is organized into three layers:

#### 1. Domain Layer (`domain/`)
- **entities/**: Domain models (pure TypeScript interfaces/types)
- **usecases/**: Business logic (use cases/interactors)
- **repositories/**: Repository interfaces (abstractions)

**Rules:**
- No framework dependencies
- Pure business logic
- Define interfaces, not implementations

**Example:**
```typescript
// features/auth/domain/entities/User.ts
export interface User {
  mobile_no: string;
  name?: string;
  ff_id?: string;
  points: number;
}

// features/auth/domain/repositories/IAuthRepository.ts
export interface IAuthRepository {
  sendOTP(mobileNumber: string): Promise<void>;
  verifyOTP(mobileNumber: string, otp: string): Promise<boolean>;
  checkUserExists(mobileNumber: string): Promise<boolean>;
  createUser(user: User): Promise<void>;
}

// features/auth/domain/usecases/SendOTPUseCase.ts
export class SendOTPUseCase {
  constructor(private authRepo: IAuthRepository) {}
  
  async execute(mobileNumber: string): Promise<void> {
    // Business logic here
    await this.authRepo.sendOTP(mobileNumber);
  }
}
```

#### 2. Data Layer (`data/`)
- **datasources/**: External data sources (API, Firestore, etc.)
- **repositories/**: Repository implementations

**Rules:**
- Implements domain repository interfaces
- Handles external API calls, database operations
- Converts external data to domain entities

**Example:**
```typescript
// features/auth/data/datasources/OTPDataSource.ts
export class OTPDataSource {
  async sendOTP(mobileNumber: string): Promise<void> {
    // Call Vercel API
  }
}

// features/auth/data/repositories/AuthRepository.ts
export class AuthRepository implements IAuthRepository {
  constructor(private otpDataSource: OTPDataSource) {}
  
  async sendOTP(mobileNumber: string): Promise<void> {
    await this.otpDataSource.sendOTP(mobileNumber);
  }
}
```

#### 3. Presentation Layer (`presentation/`)
- **viewmodels/**: View models (custom React hooks)
- **views/**: UI components and pages

**Rules:**
- Uses view models to access use cases
- View models call use cases, not repositories directly
- Views are pure UI, logic in view models

**Example:**
```typescript
// features/auth/presentation/viewmodels/useLoginViewModel.ts
export const useLoginViewModel = () => {
  const sendOTPUseCase = new SendOTPUseCase(authRepository);
  
  const sendOTP = async (mobileNumber: string) => {
    await sendOTPUseCase.execute(mobileNumber);
  };
  
  return { sendOTP };
};

// features/auth/presentation/views/login-page.tsx
export const LoginPage: React.FC = () => {
  const { sendOTP } = useLoginViewModel();
  // UI code only
};
```

### Shared (`src/shared/`)

Code shared across multiple features:

- **components/**: Reusable UI components
  - `ui/`: Base components (Button, Input, Card, Modal, etc.)
  - `layout/`: Layout components (BottomNav, PageContainer)
  - `feedback/`: Feedback components (Toast, Alert)
- **hooks/**: Shared custom hooks
- **utils/**: Utility functions
- **services/**: External service integrations (Firebase, Cloudinary)
- **types/**: Shared TypeScript types

### Core (`src/core/`)

Application-wide setup:
- **contexts/**: Global React contexts
- **routing/**: Routing configuration
- **config/**: App configuration
- **App.tsx**: Root component

## Component Reusability Guidelines

### Creating Reusable Components

1. **Start with Base UI Components** (`shared/components/ui/`)
   ```typescript
   // shared/components/ui/Button.tsx
   interface ButtonProps {
     variant?: 'primary' | 'secondary' | 'accent';
     size?: 'sm' | 'md' | 'lg';
     children: React.ReactNode;
     onClick?: () => void;
   }
   
   export const Button: React.FC<ButtonProps> = ({ 
     variant = 'primary', 
     size = 'md',
     children,
     ...props 
   }) => {
     // Base button implementation
   };
   ```

2. **Build Feature Components Using Base Components**
   ```typescript
   // features/tournament/presentation/views/tournament-card.tsx
   import { Button, Card } from '@/shared/components/ui';
   
   export const TournamentCard: React.FC<TournamentCardProps> = ({ tournament }) => {
     return (
       <Card>
         <h3>{tournament.name}</h3>
         <Button variant="primary">Enroll</Button>
       </Card>
     );
   };
   ```

3. **Composition Over Duplication**
   - Extract common patterns into reusable components
   - Compose complex components from simpler ones
   - Use render props or children when appropriate

### Component Hierarchy

```
Base UI Components (shared/components/ui/)
    ↓
Feature Components (features/*/presentation/views/)
    ↓
Pages (features/*/presentation/views/)
```

## Dependency Flow

```
Presentation → Domain ← Data
     ↓           ↑
   ViewModels  Use Cases
     ↓           ↑
   Use Cases → Repositories (interfaces)
                 ↑
            Repository Implementations
                 ↑
            Data Sources
```

**Important:** 
- Presentation layer depends on Domain layer
- Data layer implements Domain layer interfaces
- Domain layer has NO dependencies on Presentation or Data

## Best Practices

1. **Always use interfaces** for repositories (Dependency Inversion)
2. **Extract reusable logic** to shared utilities or hooks
3. **Keep components small and focused** (Single Responsibility)
4. **Use composition** for component reusability
5. **Type everything** with TypeScript interfaces
6. **Test use cases independently** (easier with clean architecture)
7. **Separate concerns**: UI, business logic, and data access

## Migration Strategy

When adding new features:
1. Create feature folder in `src/features/`
2. Define domain entities
3. Define repository interfaces
4. Create use cases
5. Implement data layer
6. Build presentation layer (view models + views)
7. Reuse components from `shared/components/`







