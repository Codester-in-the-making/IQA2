# Interactive Quiz Builder - Test Guide

## ✅ Setup Verification

**Components Implemented:**
- ✅ Interactive quiz builder interface in admin panel
- ✅ Quiz type selection (Multiple Choice, True/False)
- ✅ Dynamic option management (add/remove)
- ✅ Correct answer selection with visual feedback
- ✅ Explanation field for feedback
- ✅ Preview functionality
- ✅ Quiz metadata storage in database
- ✅ User-side interactive quiz display
- ✅ User-side quiz interaction with feedback

## 🧪 Admin-Side Testing Checklist

### Test 1: Creating a Multiple Choice Quiz
1. **Open admin interface** (`admin.html`)
2. **Select a course** and start creating a new lesson
3. **Add a quiz question material** using the "+ Quiz Question" button
4. Verify that the Interactive Quiz Builder appears with:
   - Quiz type selector (Multiple Choice should be default)
   - Question input field
   - Four default answer options (A, B, C, D)
   - Option to add more options
   - Explanation field
   - Preview button
5. **Enter a question** (e.g., "What does 'كتاب' mean in English?")
6. **Enter answer options**:
   - A: "Book" (mark as correct)
   - B: "House"
   - C: "Car"
   - D: "Tree"
7. **Add an explanation** (e.g., "كتاب is the Arabic word for book.")
8. **Click "Preview Quiz"** to test appearance
9. Verify correct appearance in preview modal
10. **Save the lesson** and check that quiz data is saved correctly

### Test 2: Creating a True/False Quiz
1. Create a new lesson or edit an existing one
2. Add a quiz question material
3. **Select "True/False"** quiz type
4. Verify that options change to just "True" and "False"
5. **Enter a question** (e.g., "The word 'سلام' means 'peace' in Arabic.")
6. **Select "True"** as the correct answer
7. **Add an explanation** if desired
8. **Preview and save** the quiz
9. Verify that True/False options are displayed correctly in preview

### Test 3: Edit Functionality
1. **Edit an existing lesson** with a quiz question
2. Verify that all saved quiz data loads correctly:
   - Question text
   - Quiz type
   - Options
   - Correct answer selection
   - Explanation
3. **Make changes** to various elements:
   - Change quiz type from Multiple Choice to True/False (or vice versa)
   - Edit question
   - Add/remove/edit options
   - Change correct answer
   - Edit explanation
4. **Test quiz type switching bug fix**:
   - Create a Multiple Choice quiz with default ABCD options
   - Switch to True/False and verify options change to T/F
   - Switch back to Multiple Choice and verify options change back to ABCD
5. **Save changes** and verify persistence

### Test 4: Option Management
1. Create a new Multiple Choice quiz
2. **Add additional options** beyond the default four
   - Click "Add Option" to add option E, F, etc.
3. **Try to remove options** (cannot go below 2 options)
4. **Change the correct answer** between different options
5. Verify visual feedback when selecting correct answers

## 🧪 User-Side Testing Checklist

### Test 5: Viewing Quizzes
1. **Navigate to a lesson** with quizzes as a user
2. Verify quizzes display properly with:
   - Clear question text
   - All options visible
   - Interactive option selection
   - No answers pre-revealed

### Test 6: Quiz Interaction
1. **Select an answer** in a quiz
2. Verify correct visual feedback:
   - Selected option is highlighted
   - Correct/incorrect indication appears
   - Explanation shows (if provided)
   - Other options become non-clickable
3. **Select an incorrect answer** in another quiz
4. Verify the correct answer is revealed after selection
5. **Test both Multiple Choice and True/False quizzes**:
   - Verify that all options are clickable
   - Verify that correct answers are properly identified
   - Verify that incorrect answers show the correct answer
   - Verify that feedback and explanations appear correctly

### Test 7: Browser Compatibility
1. Test the entire quiz workflow in:
   - Chrome/Edge
   - Firefox
   - Mobile browsers (responsive design)

## 🔍 Debug Information

When testing, check the browser console for helpful debugging information:

```
🎯 Loaded quiz data from metadata:
{
  questionType: "multiple_choice",
  question: "What does 'كتاب' mean?",
  options: [
    {id: "A", text: "Book", isCorrect: true},
    {id: "B", text: "House", isCorrect: false},
    {id: "C", text: "Car", isCorrect: false},
    {id: "D", text: "Tree", isCorrect: false}
  ],
  explanation: "كتاب is the Arabic word for book."
}
```

## 🎯 Success Criteria

✅ **Admin Creation**: Quiz builder interface is intuitive and easy to use  
✅ **Quiz Types**: Both Multiple Choice and True/False quizzes work correctly  
✅ **Option Management**: Adding, removing, and editing options works smoothly  
✅ **Preview**: Admin-side preview shows an accurate representation of the quiz  
✅ **Data Storage**: Quiz data is correctly saved to and loaded from the database  
✅ **User Experience**: Users can interact with quizzes and receive appropriate feedback  
✅ **Responsive Design**: Quiz interface works on various screen sizes

## 📝 Troubleshooting

**If quiz data isn't loading:**
1. Check browser console for error messages
2. Verify that `metadata.quizData` exists in the lesson material
3. Try creating a new quiz to test the saving process

**If quiz interaction doesn't work:**
1. Check for JavaScript errors in the console
2. Verify that the onclick handlers are properly attached
3. Test in different browsers to isolate the issue

**If quiz appearance looks wrong:**
1. Check that all CSS styles are properly loaded
2. Verify the HTML structure in browser dev tools
3. Test responsiveness by resizing the browser window