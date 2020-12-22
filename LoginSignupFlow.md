## Failed

This fails due to the edge case:

1. User A signs up with someone else's email let's call them User B.
2. When User B signs up with their email, system will detect User A account and send OTP to userB@email.com
3. User B will essentially log into User A account in this case.

To prevent that edge case we need to allow OTPs to only verified emails. If we go down this route, the # of otp's generated will increase drastically. Considering the global approach we're taking, where there could be potentially millions trying to login (in a hopeful situation), OTP is not the best approach.

Hence, we're moving to Password Based flow.

/\*\*

    user: {

        name: "", (required)

        emails: [
            {priority: 1, value: "", verified: false},
            ...
        ], (required)

        phone: "", (required)(unique ID)
        socialLogins: [
            {type: "GOOGLE", auth: "" },
            {type: "LINKEDIN", auth: "" },
            {type: "OUTLOOK", auth: "" },
            {type: "FACEBOOK", auth: "" },
        ]
    }

\*\*/

## SIGN UP

### Social Sign up

    Fetch all these and ask for phone, if it doesn't exist.

    user: {
        name: "Something", (required)
        email: "Something", (required)
        phone: "", (required)
        socialLogins: ["something"]
    }

> if phone doesn't exist, ask for phone #
> Verify Phone by sending an OTP
> If verification successful, add the phone to the object
> Authenticate & Sign up using token.

### Regular Sign up

    Email & Phone
    Verify phone with otp and create account on success.

        user: {
            name: "Something", (required),
            email: [{priority: 1, value: "someemail@email.com", verified: false}, ], (required),
            phone: "+9199999999", (required) (unique ID)
            socialLogins: [],
        }

    Authenticate using OTP, and create user, send email Verification after creation.

---

## LOGIN

### Social Login

    Verify if account exists based on the email,
    if(exists){
        Login
    }
    else {
        Inform user that it's a sign up
        if(userConfirms){
            ⬆️ Go to Sign up
        }
    }

### Regular Login

    Ask for email / phone

    Dynamic input component, determine if it's email or phone.

    --- For email
    if(email exists){
        sendOTP to email
    }
    else{
        user not found.
    }

    ---- For Phone
    if(phone exists){
        sendOtp to phone and login
    }
    else{
        user not found.
    }
