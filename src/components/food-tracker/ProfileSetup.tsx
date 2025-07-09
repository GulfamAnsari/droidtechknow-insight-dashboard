
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';

interface Profile {
  age: number;
  gender: 'male' | 'female' | 'other';
  weight: number;
  height: number;
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  goal: 'lose_weight' | 'maintain_weight' | 'gain_muscle';
  targetCalories: number;
}

const ProfileSetup = () => {
  const [profile, setProfile] = useState<Profile>({
    age: 25,
    gender: 'male',
    weight: 70,
    height: 170,
    activityLevel: 'moderately_active',
    goal: 'maintain_weight',
    targetCalories: 2000,
  });

  useEffect(() => {
    // Load profile from localStorage
    const savedProfile = localStorage.getItem('foodTracker2Profile');
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
  }, []);

  const calculateBMR = () => {
    // Mifflin-St Jeor Equation
    let bmr;
    if (profile.gender === 'male') {
      bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    } else {
      bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }

    // Activity level multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extra_active: 1.9,
    };

    const tdee = bmr * activityMultipliers[profile.activityLevel];
    
    // Goal adjustments
    let targetCalories = tdee;
    if (profile.goal === 'lose_weight') {
      targetCalories = tdee - 500; // 500 calorie deficit
    } else if (profile.goal === 'gain_muscle') {
      targetCalories = tdee + 300; // 300 calorie surplus
    }

    return Math.round(targetCalories);
  };

  const handleSave = () => {
    const calculatedCalories = calculateBMR();
    const updatedProfile = { ...profile, targetCalories: calculatedCalories };
    setProfile(updatedProfile);
    localStorage.setItem('foodTracker2Profile', JSON.stringify(updatedProfile));
    toast.success('Profile saved successfully!');
  };

  const updateProfile = (field: keyof Profile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Set up your profile to get personalized nutrition recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={profile.age}
                onChange={(e) => updateProfile('age', parseInt(e.target.value) || 0)}
                placeholder="Enter your age"
              />
            </div>
            
            <div>
              <Label>Gender</Label>
              <RadioGroup
                value={profile.gender}
                onValueChange={(value) => updateProfile('gender', value)}
                className="flex space-x-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Female</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">Other</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={profile.weight}
                onChange={(e) => updateProfile('weight', parseFloat(e.target.value) || 0)}
                placeholder="Enter your weight"
              />
            </div>
            
            <div>
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={profile.height}
                onChange={(e) => updateProfile('height', parseFloat(e.target.value) || 0)}
                placeholder="Enter your height"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Level & Goals</CardTitle>
          <CardDescription>
            Help us calculate your daily calorie needs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="activity">Activity Level</Label>
            <Select value={profile.activityLevel} onValueChange={(value) => updateProfile('activityLevel', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select activity level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary (little or no exercise)</SelectItem>
                <SelectItem value="lightly_active">Lightly Active (light exercise 1-3 days/week)</SelectItem>
                <SelectItem value="moderately_active">Moderately Active (moderate exercise 3-5 days/week)</SelectItem>
                <SelectItem value="very_active">Very Active (hard exercise 6-7 days/week)</SelectItem>
                <SelectItem value="extra_active">Extra Active (very hard exercise, physical job)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="goal">Fitness Goal</Label>
            <Select value={profile.goal} onValueChange={(value) => updateProfile('goal', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lose_weight">Lose Weight</SelectItem>
                <SelectItem value="maintain_weight">Maintain Weight</SelectItem>
                <SelectItem value="gain_muscle">Gain Muscle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calculated Daily Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{calculateBMR()}</div>
              <div className="text-sm text-muted-foreground">Daily Calories</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{Math.round(calculateBMR() * 0.5 / 4)}</div>
              <div className="text-sm text-muted-foreground">Carbs (g)</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{Math.round(calculateBMR() * 0.25 / 4)}</div>
              <div className="text-sm text-muted-foreground">Protein (g)</div>
            </div>
          </div>
          
          <Button onClick={handleSave} className="w-full mt-4">
            Save Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSetup;
