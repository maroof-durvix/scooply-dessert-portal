using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scooply.Api.Data;
using Scooply.Api.Services;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ---- Logging: Serilog to console + rolling file (never log card data) ----
builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .WriteTo.Console()
    .WriteTo.File("Logs/scooply-.log", rollingInterval: RollingInterval.Day));

// ---- Database ----
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// ---- JWT authentication (Angular sends "Authorization: Bearer <token>") ----
var jwt = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidIssuer = jwt["Issuer"],
        ValidateAudience = true, ValidAudience = jwt["Audience"],
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(1)
    });
builder.Services.AddAuthorization();

// ---- CORS: allow only the Angular dev/prod origins ----
var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(o => o.AddPolicy("Angular", p =>
    p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(
        new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ---- Application services ----
builder.Services.AddScoped<IPaymentService, SimulatedPaymentService>(); // swap for a Stripe implementation later
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<RecipeAccessService>();
builder.Services.AddScoped<IFileUploadService, FileUploadService>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddSingleton<CertificateService>();

var app = builder.Build();

// ---- Global error handler: JSON problem details, no stack traces to clients ----
app.UseExceptionHandler(a => a.Run(async ctx =>
{
    ctx.Response.StatusCode = 500;
    ctx.Response.ContentType = "application/json";
    await ctx.Response.WriteAsJsonAsync(new { error = "Something went wrong. Please try again." });
}));

if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }

// HTTPS redirect only outside Development (the Angular dev server calls http://localhost:5080)
if (!app.Environment.IsDevelopment()) app.UseHttpsRedirection();
app.UseStaticFiles();            // serves wwwroot/uploads and wwwroot/images (flavor SVGs)
app.UseCors("Angular");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Apply migrations and seed demo data on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    await DbSeeder.SeedAsync(db);
}

app.Run();
