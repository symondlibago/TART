# Monitoring Systems Dashboard

A comprehensive, responsive web application built with React.js and TailwindCSS for monitoring various business operations including expenses, equipment inventory, task management, and payroll.

## 🚀 Features

### 📊 Dashboard Overview
- Real-time statistics and metrics
- Recent activities feed
- System alerts and notifications
- Quick action buttons

### 💰 Expenses & Receipts Monitoring
- Track all purchased materials and expenses
- Display transaction dates and details
- Advanced search and filtering capabilities
- Export functionality
- Receipt number tracking
- Vendor and category management

### 🔧 Equipment Inventory System
- Track tools and equipment borrowing
- Visual equipment cards with status indicators
- Borrower information and due dates
- Quantity management (total, available, borrowed)
- Equipment condition tracking
- Grid and list view options

### 📋 Task Monitoring System
- Comprehensive task management
- Task assignment to team members
- Progress tracking with visual progress bars
- Priority levels and status indicators
- Date, time, and location tracking
- Category-based organization

### 💼 Workers' Payroll Monitoring
- Detailed payroll records per worker
- Gross pay, deductions, and net pay calculations
- Hours worked and overtime tracking
- Payment method and status tracking
- Deduction breakdown (tax, insurance, retirement)
- Department and position management

## 🎨 Design Features

- **High-Energy Visual Style**: Vibrant color palette with electric blue, red, black, and white
- **Smooth Animations**: Framer Motion powered transitions and micro-interactions
- **Responsive Design**: Mobile-first approach with seamless desktop experience
- **Modern UI Components**: Built with shadcn/ui components
- **Fast Navigation**: React Router for smooth page transitions

## 🛠️ Technology Stack

- **Frontend**: React.js 18+
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Routing**: React Router DOM
- **Build Tool**: Vite
- **Package Manager**: pnpm

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd monitoring-systems
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start the development server**
   ```bash
   pnpm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` (or the port shown in terminal)

## 🏗️ Build for Production

```bash
pnpm run build
```

The built files will be in the `dist` directory.

## 📱 Responsive Design

The application is fully responsive and optimized for:
- Mobile devices (320px+)
- Tablets (768px+)
- Desktop computers (1024px+)
- Large screens (1440px+)

## 🎯 Key Components

### Navigation
- Collapsible sidebar with smooth animations
- Mobile-friendly hamburger menu
- Active route highlighting
- System status indicators

### Data Management
- Local state management with React hooks
- Filtering and search functionality
- Real-time data updates
- Export capabilities

### Visual Elements
- Gradient backgrounds and borders
- Hover effects and transitions
- Loading states and animations
- Status indicators and badges

## 🔧 Customization

### Color Scheme
The application uses a custom color palette defined in `src/App.css`:
- Electric Blue: `oklch(0.6 0.3 240)`
- Electric Red: `oklch(0.7 0.35 15)`
- Dark Background: `oklch(0.05 0 0)`
- White Text: `oklch(1 0 0)`

### Adding New Features
1. Create new components in `src/components/`
2. Add routes in `src/App.jsx`
3. Update navigation in the sidebar
4. Follow the existing design patterns

## 📊 Sample Data

The application includes comprehensive sample data for demonstration:
- 6 expense records with various categories
- 6 equipment items with borrowing information
- 6 tasks with different statuses and priorities
- 6 payroll records with detailed calculations

## 🚀 Deployment

The application can be deployed to any static hosting service:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For support and questions, please open an issue in the GitHub repository.

---

Built with ❤️ using React.js and TailwindCSS

