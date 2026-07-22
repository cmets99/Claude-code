// Wraps an async Express handler so a rejected promise reaches next(err)
// instead of hanging the request (Express 4 doesn't await handlers itself).
module.exports = function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
