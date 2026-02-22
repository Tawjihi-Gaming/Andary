using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Backend.Filters
{
    public class ValidatePlayerOwnershipFilter : ActionFilterAttribute
    {
        public override void OnActionExecuting(ActionExecutingContext context)
        {
            int? playerId = null;
            foreach (var argument in context.ActionArguments.Values)
            {
                if (argument != null)
                {
                    var prop = argument.GetType().GetProperty("PlayerId");
                    if (prop != null)
                    {
                        playerId = prop.GetValue(argument) as int?;
                        break;
                    }
                }
            }

            if (!playerId.HasValue)
            {
                base.OnActionExecuting(context);
                return;
            }

            // If PlayerId is provided, user must be authenticated with valid JWT
            // Frontend: On 401 response, attempt token refresh before redirecting to login
            if (context.HttpContext.User?.Identity?.IsAuthenticated != true)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            var currentUserIdClaim = context.HttpContext.User.FindFirst("sub");
            
            if (currentUserIdClaim == null 
            || !int.TryParse(currentUserIdClaim.Value, out int currentUserId) 
            || currentUserId != playerId.Value)
            {
                context.Result = new UnauthorizedObjectResult(new 
                    { error = "You cannot act for another player." });
                return;
            }

            base.OnActionExecuting(context);
        }
    }
}