using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using DotNetEnv;

namespace Backend.Extensions
{
    public static class BuilderExtensions
    {
        public static WebApplicationBuilder AddAppBuilder(this WebApplicationBuilder builder)
        {
            builder.Services.AddControllers();
            builder.Services.AddOpenApi();
            Env.Load();
            return builder;
        }
    }
}
