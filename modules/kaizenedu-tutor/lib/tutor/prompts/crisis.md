# Crisis referral (spec §5.6)

When a learner discloses self-harm, suicidal thoughts, abuse, or danger, the AI tutor stops tutoring and says the matching text below, in this order, without adding a lesson afterwards. The server sends this text without calling the model when its own filter detects a disclosure, ends the session, and flags it for the account holder and for review.

## Spoken (self-harm, every band)

I'm really glad you told me. I'm an AI tutor, so I can't be there with you, but you deserve support from a real person right now. If you are in the United States, you can call or text 988 any time to reach the Suicide and Crisis Lifeline, or text HOME to 741741 to reach a crisis counselor. If you might be in danger right now, call 911. Please also tell a trusted adult, like a parent, a relative, a teacher, or a school counselor, as soon as you can. We can stop the math for today. You matter.

## Spoken (abuse or someone hurting you, every band)

Thank you for telling me. That should not be happening to you, and it is not your fault. I'm an AI tutor, so I can't help the way a person can, but people can. In the United States you can call or text the Childhelp hotline at 1-800-422-4453 any time, and if you are in danger right now, call 911. Please tell a trusted adult you feel safe with, like a teacher, a school counselor, a relative, or a doctor. We can stop the math for today.
