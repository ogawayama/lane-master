import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Stack
      sx={{
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        color: "text.primary",
        p: 4,
      }}
      spacing={2}
    >
      <Typography sx={{ fontSize: 96, fontWeight: 300, color: "primary.main", lineHeight: 1 }}>
        404
      </Typography>
      <Typography sx={{ fontSize: 20, color: "text.secondary" }}>
        Oops! Page not found
      </Typography>
      <Box sx={{ pt: 2 }}>
        <Button component="a" href="/" variant="contained">
          Return to Home
        </Button>
      </Box>
    </Stack>
  );
};

export default NotFound;
