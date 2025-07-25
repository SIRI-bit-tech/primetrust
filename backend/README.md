# PrimeTrust Backend API

A modern, secure banking API built with Django and Django REST Framework, providing comprehensive financial services including user management, transactions, investments, loans, and bill payments.

## 🚀 Features

- **User Authentication & Authorization**: JWT-based authentication with refresh tokens
- **Account Management**: User profiles, balance tracking, and account verification
- **Virtual Cards**: Generate and manage virtual debit cards
- **Money Transfers**: Secure peer-to-peer transfers
- **Investment Platform**: Stock and cryptocurrency trading
- **Loan Services**: Personal loan applications and management
- **Bill Payments**: Automated bill payment system
- **Real-time Notifications**: WebSocket-based notifications
- **Security**: 256-bit encryption, multi-factor authentication, fraud detection

## 🛠 Tech Stack

- **Framework**: Django 5.2.4
- **API**: Django REST Framework 3.16.0
- **Authentication**: JWT (djangorestframework-simplejwt)
- **Database**: PostgreSQL
- **Task Queue**: Celery with Redis
- **File Storage**: Cloudinary
- **CORS**: django-cors-headers
- **Environment**: python-decouple

## 📋 Prerequisites

- Python 3.8+
- PostgreSQL
- Redis
- Virtual environment tool (venv, virtualenv, or conda)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PrimeTrust/backend
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   Create a `.env` file in the backend directory:
   ```env
   DEBUG=True
   SECRET_KEY=your-secret-key-here
   DATABASE_URL=postgresql://username:password@localhost:5432/primetrust_db
   REDIS_URL=redis://localhost:6379/0
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ALLOWED_HOSTS=localhost,127.0.0.1
   CORS_ALLOWED_ORIGINS=http://localhost:3000
   ```

5. **Set up database**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. **Create superuser**
   ```bash
   python manage.py createsuperuser
   ```

7. **Run the development server**
   ```bash
   python manage.py runserver
   ```

## 🗄 Database Setup

### PostgreSQL Installation

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS:**
```bash
brew install postgresql
```

**Windows:**
Download from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### Create Database
```bash
sudo -u postgres psql
CREATE DATABASE primetrust_db;
CREATE USER primetrust_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE primetrust_db TO primetrust_user;
\q
```

## 🔄 Running with Celery

1. **Start Redis server**
   ```bash
   redis-server
   ```

2. **Start Celery worker**
   ```bash
   celery -A primetrust worker -l info
   ```

3. **Start Celery beat (for scheduled tasks)**
   ```bash
   celery -A primetrust beat -l info
   ```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/refresh/` - Refresh JWT token
- `POST /api/auth/verify-email/` - Email verification
- `POST /api/auth/logout/` - User logout

### User Management

- `GET /api/users/profile/` - Get user profile
- `PUT /api/users/profile/` - Update user profile
- `GET /api/users/balance/` - Get account balance

### Banking Services

- `GET /api/banking/cards/` - Get virtual cards
- `POST /api/banking/cards/` - Generate new virtual card
- `GET /api/banking/transfers/` - Get transfer history
- `POST /api/banking/transfers/` - Initiate transfer

### Investment Services

- `GET /api/investments/` - Get user investments
- `POST /api/investments/purchase/` - Purchase investment
- `POST /api/investments/{id}/sell/` - Sell investment
- `GET /api/investments/market-data/` - Get market data

### Loan Services

- `GET /api/loans/` - Get user loans
- `POST /api/loans/apply/` - Apply for loan
- `POST /api/loans/{id}/pay/` - Make loan payment

### Bill Management

- `GET /api/bills/` - Get user bills
- `POST /api/bills/` - Add new bill
- `POST /api/bills/pay/` - Pay bill

## 🧪 Testing

Run the test suite:
```bash
python manage.py test
```

Run with coverage:
```bash
coverage run --source='.' manage.py test
coverage report
coverage html
```

## 🚀 Deployment

### Production Settings

1. **Update settings.py**
   - Set `DEBUG = False`
   - Configure production database
   - Set up proper CORS settings
   - Configure static files

2. **Collect static files**
   ```bash
   python manage.py collectstatic
   ```

3. **Set up environment variables**
   ```env
   DEBUG=False
   SECRET_KEY=your-production-secret-key
   DATABASE_URL=your-production-database-url
   ALLOWED_HOSTS=your-domain.com
   ```

### Docker Deployment

1. **Build the image**
   ```bash
   docker build -t primetrust-backend .
   ```

2. **Run the container**
   ```bash
   docker run -p 8000:8000 primetrust-backend
   ```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt password hashing
- **CORS Protection**: Configured CORS headers
- **SQL Injection Protection**: Django ORM protection
- **XSS Protection**: Built-in Django security
- **CSRF Protection**: Cross-site request forgery protection
- **Rate Limiting**: API rate limiting (configurable)
- **Input Validation**: Comprehensive form and model validation

## 📁 Project Structure

```
backend/
├── accounts/          # User authentication and profiles
├── api/              # API views and serializers
├── banking/          # Banking services (cards, transfers)
├── transactions/     # Transaction management
├── primetrust/       # Main Django project settings
├── requirements.txt  # Python dependencies
└── manage.py        # Django management script
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@primetrust.com or create an issue in the repository.

## 🔗 Links

- [Frontend Repository](../frontend)
- [API Documentation](http://localhost:8000/api/docs/)
- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/) 