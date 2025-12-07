const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails && profile.emails[0] && profile.emails[0].value;
        const googleId = profile.id;
        const name =
          profile.displayName ||
          (email && email.split("@")[0]) ||
          "google_user";
        const avatar =
          profile.photos && profile.photos[0] && profile.photos[0].value;

        let user = null;
        if (email) {
          user = await User.findOne({ email });
        }
        if (!user) {
          user = await User.findOne({ googleId });
        }
        if (!user) {
          // create username unique
          const base = (name || "user").toLowerCase().replace(/[^\w.-]/g, "");
          let username = base || `user${Math.floor(Math.random() * 10000)}`;
          let i = 0;
          while (await User.findOne({ username })) {
            i++;
            username = `${base}${i}`;
          }
          user = await User.create({
            username,
            email: email || undefined,
            password: Math.random().toString(36).slice(2), // random password (not used)
            avatar: avatar || undefined,
            googleId,
          });
        } else if (!user.googleId) {
          // attach googleId if missing
          user.googleId = googleId;
          if (!user.avatar && avatar) user.avatar = avatar;
          await user.save();
        }
        return done(null, user);
      } catch (err) {}
      return done(err, null);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const UserModel = require("../models/User");
    const u = await UserModel.findById(id);
    done(null, u);
  } catch (err) {
    done(err, null);
  }
});
module.exports = passport;
